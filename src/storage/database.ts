import { Collection, Db, MongoClient } from "mongodb";
import { Item, LoadedItem } from "../core/item";
import { Rinse } from "../core/washers/rinse";
import { Wash } from "../core/washers/wash";
import { WasherInstance } from "../core/washers/washer";

/**
 * Helper class for database functions.
 */
export class Database {
  private static db: Db;
  private static memory: Collection<any>;
  private static log: Collection<any>;

  /**
   * Set up the database connection.
   * @param connection a mongodb:// connection string
   */
  static async init(connection: string): Promise<void> {
    const client = await new MongoClient(connection, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    }).connect();
    Database.db = client.db();

    // A collection to save state for each washer
    const memory = Database.db.collection("memory");
    await memory.createIndex("washerId", { unique: true });
    Database.memory = memory;

    // A collection to save logs
    Database.log = await Database.db.createCollection("log", {
      capped: true,
      size: 1048576 * 10 // 10MB
    });
  }

  /**
   * Return the memory object for a washer, or an empty object if there isn't one.
   * @param washer the washer
   */
  static async loadMemory(washer: WasherInstance): Promise<void> {
    const memory = await Database.memory.findOne({ washerId: washer.id });
    washer.memory = memory || {};
  }

  /**
   * Save the memory object for a washer.
   * @param washer the washer
   * @param memory the memory object
   */
  static async saveMemory(washer: WasherInstance): Promise<void> {
    washer.memory.lastRun = new Date();
    await Database.memory.replaceOne(
      { washerId: washer.id },
      { $set: washer.memory },
      { upsert: true }
    );
  }

  /**
   * Get items from a washer newer than a given date.
   * @param washer the washer
   * @param since return items newer than this date
   */
  static async loadItems(
    washer: WasherInstance,
    since: Date
  ): Promise<LoadedItem[]> {
    if (!washer) {
      return [];
    }

    const items: LoadedItem[] = await Database.db
      .collection(washer.id)
      .find(
        {
          date: { $gt: since }
        },
        { sort: { date: -1 } }
      )
      .toArray();

    items.forEach(i => {
      i.washerId = washer.id;
      i.washerTitle = washer.getInfo().title;
    });

    return items;
  }

  /**
   * Save new items generated by a washer
   * @param washer the washer
   * @param items the items generated by the washer
   */
  static async saveItems(washer: Wash | Rinse, items: Item[]): Promise<void> {
    if (!washer || !items.length) {
      return;
    }

    // Newest items first
    items.sort((a, b) => b.date.getTime() - a.date.getTime());
    washer.memory.lastItem = items[0];

    const collection = Database.db.collection(washer.id);
    await collection.createIndex("date");
    await collection.insertMany(items);

    if (washer.retain) {
      const retainDate = new Date(
        Date.now() - washer.retain * 24 * 60 * 60 * 1000
      );
      await collection.deleteMany({ date: { $lt: retainDate } });
    }
  }

  /**
   * Receive a callback whenever a washer generates a new item.
   * @param washer the washer to subscribe to
   * @param callback a callback to receive new items on
   */
  static subscribe(
    washer: Wash | Rinse,
    callback: (item: LoadedItem) => void
  ): void {
    const pipeline = [{ $match: { operationType: "insert" } }];
    const changeStream = Database.db.collection(washer.id).watch(pipeline);

    changeStream.on("change", change => {
      const item: LoadedItem = change.fullDocument;
      item.washerId = washer.id;
      item.washerTitle = washer.getInfo().title;
      callback(item);
    });
  }

  static async writeLog(log: Item): Promise<void> {
    await Database.log.insertOne(log);
  }
}
