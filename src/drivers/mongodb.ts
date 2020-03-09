import clone from "clone";
import franc from "franc";
import { DateTime } from "luxon";
import {
  Collection,
  Db,
  FilterQuery,
  FindOneOptions,
  MongoClient
} from "mongodb";
import { Database } from "../core/database";
import { Item, LoadedItem, LogItem, MongoLanguage } from "../core/item";
import { Log } from "../core/log";
import { Memory } from "../core/memory";
import { Rinse } from "../core/washers/rinse";
import { Wash } from "../core/washers/wash";
import { Washer } from "../core/washers/washer";

/**
 * MongoDB driver.
 */
export class MongoDB extends Database {
  private db!: Db;
  private memory!: Collection<any>;
  private log!: Collection<any>;

  async init(connection: string): Promise<void> {
    const client = await new MongoClient(connection, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    }).connect();
    this.db = client.db();

    // A collection to save state for each washer
    const memory = this.db.collection("memory");
    await memory.createIndexes([
      { name: "washerId", key: { washerId: 1 }, unique: true }
    ]);
    this.memory = memory;

    // A collection to save logs
    this.log = await this.db.createCollection(Log.collection, {
      capped: true,
      size: 1048576 * 10 // 10MB
    });
    await this.log.createIndexes([
      { name: "created", key: { created: -1 } },
      { name: "saved", key: { saved: -1 } }
    ]);
  }

  hydrateItem(document: any, name?: string, id?: string): LoadedItem {
    delete document._id;
    if (name) {
      document.washerName = name;
    }
    if (id) {
      document.washerId = id;
    }
    document.saved = DateTime.fromJSDate(document.saved).toUTC();
    document.created = DateTime.fromJSDate(document.created).toUTC();
    return document;
  }

  hydrateWasherItem(document: any, washer: Washer): LoadedItem {
    return this.hydrateItem(document, washer.info.name, washer.config.id);
  }

  dehydrateItem(item: Item): any {
    const document: any = clone(item);
    delete document.downloads;
    document.saved = DateTime.utc();

    if (!document.language) {
      document.franc = franc(`${item.title} ${item.text} ${item.tags}`);
      const francLangs = Object.values(MongoLanguage);
      const mongoLangs = Object.keys(MongoLanguage);
      const mongoLang = mongoLangs[francLangs.indexOf(document.franc)];
      if (mongoLang) {
        document.language = mongoLang;
      }
    }

    return document;
  }

  async loadMemory(washer: Washer): Promise<Memory> {
    let memory = await this.memory.findOne({
      washerId: washer.config.id
    });
    memory = memory || {};

    if (memory.lastRun) {
      memory.lastRun = DateTime.fromJSDate(memory.lastRun).toUTC();
    } else {
      memory.lastRun = DateTime.fromSeconds(0);
    }

    memory.config = memory.config || washer.config;

    return memory;
  }

  async saveMemory(washer: Washer): Promise<void> {
    if (!washer.info.memory && !washer.config.schedule) {
      return;
    }

    washer.memory.lastRun = DateTime.utc();
    washer.memory.lastDuration = washer.memory.lastRun.diff(
      washer.startTime
    ).milliseconds;
    delete washer.memory.config.filter;

    await this.memory.replaceOne(
      { washerId: washer.config.id },
      { $set: washer.memory },
      { upsert: true }
    );
  }

  async loadItems(
    washer: Washer,
    since: DateTime,
    filter: FilterQuery<any> = {}
  ): Promise<LoadedItem[]> {
    if (!washer) {
      return [];
    }

    filter = Object.assign(filter, { saved: { $gt: since } });
    const options: FindOneOptions = { sort: { saved: -1 } };

    const items: any[] = await this.db
      .collection(washer.config.id)
      .find(filter, options)
      .toArray();

    const loadedItems = items.map(i => this.hydrateWasherItem(i, washer));

    return loadedItems;
  }

  async saveItems(washer: Wash | Rinse, items: Item[]): Promise<void> {
    if (!washer || !items || !items.length) {
      return;
    }

    // Set up the collection
    const collection = this.db.collection(washer.config.id);

    await collection.createIndexes([
      { name: "created", key: { created: -1 } },
      { name: "saved", key: { saved: -1 } },
      { name: "url", key: { url: 1 }, unique: true },
      {
        name: "text",
        key: { title: "text", tags: "text", author: "text", text: "text" },
        weights: { title: 10, tags: 10, author: 10, text: 5 }
      }
    ]);

    // Prepare the items for saving
    const saveItems: any[] = items.map(i => this.dehydrateItem(i));

    // Save the items
    await Promise.all(
      saveItems.map(i =>
        collection.replaceOne({ url: i.url }, { $set: i }, { upsert: true })
      )
    );

    // Delete old items
    const retainDate = washer.retainDate();
    if (!retainDate) {
      return;
    }

    await collection.deleteMany({ created: { $lt: retainDate } });
  }

  subscribeToWasher(
    washer: Wash | Rinse,
    callback: (item: LoadedItem) => void,
    filter: FilterQuery<any> = {}
  ): void {
    this.subscribeToCollection(
      washer.config.id,
      (change: any) => {
        const item: LoadedItem = this.hydrateWasherItem(
          change.fullDocument,
          washer
        );

        callback(item);
      },
      filter
    );
  }

  subscribeToLog(
    callback: (item: LoadedItem) => void,
    filter: FilterQuery<any> = {}
  ): void {
    this.subscribeToCollection(
      Log.collection,
      (change: any) => {
        const item: LoadedItem = this.hydrateItem(change.fullDocument);

        callback(item);
      },
      filter
    );
  }

  subscribeToCollection(
    collection: string,
    callback: (item: LoadedItem) => void,
    filter: FilterQuery<any> = {}
  ): void {
    const match: any = {};
    Object.keys(filter).forEach(k => (match[`fullDocument.${k}`] = filter[k]));
    match.operationType = "insert";

    const pipeline = [{ $match: match }];

    const changeStream = this.db.collection(collection).watch(pipeline);

    changeStream.on("change", change => {
      callback(change);
    });
  }

  async writeLog(log: LogItem): Promise<void> {
    await this.log.insertOne(log);
  }
}
