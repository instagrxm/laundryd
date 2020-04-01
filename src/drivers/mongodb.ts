import clone from "clone";
import { DateTime } from "luxon";
import {
  Collection,
  Db,
  FilterQuery,
  FindOneOptions,
  MongoClient
} from "mongodb";
import {
  Database,
  Item,
  Log,
  LogItem,
  Memory,
  Rinse,
  Wash,
  Washer
} from "../core";

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
      { name: "washer.id", key: { "washer.id": 1 }, unique: true },
      { name: "washer.name", key: { "washer.name": 1 }, unique: false }
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

  hydrateItem(document: any): Item {
    if (!document) {
      return document;
    }
    delete document._id;
    document.saved = DateTime.fromJSDate(document.saved).toUTC();
    document.created = DateTime.fromJSDate(document.created).toUTC();
    return document;
  }

  dehydrateItem(item: Item): any {
    const document: any = clone(item);
    delete document.downloads;
    document.saved = DateTime.utc();
    return document;
  }

  async loadMemory(washer: Washer): Promise<Memory> {
    let memory = await this.memory.findOne({
      "washer.id": washer.config.id,
      "washer.name": washer.info.name
    });
    memory = memory || {};

    if (memory.lastRun) {
      memory.lastRun = DateTime.fromJSDate(memory.lastRun).toUTC();
    } else {
      memory.lastRun = DateTime.fromSeconds(0);
    }

    memory.config = memory.config || washer.config;
    memory.washer = memory.washer || {
      name: washer.info.name,
      id: washer.config.id
    };

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
    washer.memory.config = washer.config;
    washer.memory = clone(washer.memory);

    // filter has fields like $regex which can't be saved
    delete washer.memory.config.filter;

    await this.memory.replaceOne(
      { "washer.id": washer.config.id, "washer.name": washer.info.name },
      { $set: washer.memory },
      { upsert: true }
    );
  }

  async loadItems(
    washer: Washer,
    since: DateTime,
    filter: FilterQuery<any> = {}
  ): Promise<Item[]> {
    if (!washer) {
      return [];
    }

    filter = this.prepareFilter(filter);
    filter.saved = { $gt: since };

    const options: FindOneOptions = { sort: { saved: -1 } };

    const docs: any[] = await this.db
      .collection(washer.config.id)
      .find(filter, options)
      .toArray();

    const items = docs.map(i => this.hydrateItem(i));

    return items;
  }

  /**
   * Given a filter object from a washer, format it to work in a MongoDB query.
   * @param filter a filter object from a waher
   * @param fullDocument whether to append fullDocument to top-level keys
   */
  prepareFilter(filter: any, fullDocument = false): any {
    function process(obj: any): any {
      if (typeof obj !== "object") {
        return obj;
      }
      const out: any = {};
      for (let key in obj) {
        const val: any = obj[key];

        if (fullDocument && !key.startsWith("$")) {
          key = `fullDocument.${key}`;
        }

        if (Array.isArray(val)) {
          // Recursively process arrays
          out[key] = val.map(i => process(i));
        } else if (typeof val === "object") {
          // Recursively process objects
          out[key] = process(val);
        } else {
          // Everything else pass through
          out[key] = val;
        }
      }
      return out;
    }
    return process(filter);
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
    callback: (item: Item) => void,
    filter: FilterQuery<any> = {}
  ): void {
    this.subscribeToCollection(
      washer.config.id,
      (change: any) => {
        const item: Item = this.hydrateItem(change.fullDocument);
        callback(item);
      },
      filter
    );
  }

  subscribeToLog(
    callback: (item: Item) => void,
    filter: FilterQuery<any> = {}
  ): void {
    this.subscribeToCollection(
      Log.collection,
      (change: any) => {
        const item: Item = this.hydrateItem(change.fullDocument);

        callback(item);
      },
      filter
    );
  }

  subscribeToCollection(
    collection: string,
    callback: (item: Item) => void,
    filter: FilterQuery<any> = {}
  ): void {
    filter = this.prepareFilter(filter, true);
    filter.operationType = { $in: ["insert", "replace"] };

    const pipeline = [{ $match: filter }];
    const changeStream = this.db.collection(collection).watch(pipeline);

    changeStream.on("change", change => {
      callback(change);
    });
  }

  async writeLog(log: LogItem): Promise<void> {
    await this.log.insertOne(clone(log));
  }

  async existing(washer: Washer, url: string): Promise<Item | undefined> {
    const document = await this.db
      .collection(washer.config.id)
      .findOne({ url });
    return this.hydrateItem(document);
  }
}
