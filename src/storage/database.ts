import { Collection, Db, MongoClient } from "mongodb";
import { Memory } from "../core/memory";
import { WasherInstance } from "../core/washers/washer";

export class Database {
  private db!: Db;
  private memory!: Collection<any>;

  async init(connection: string): Promise<void> {
    const client = await new MongoClient(connection, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    }).connect();
    this.db = client.db();

    this.memory = this.db.collection("memory");
    await this.memory.createIndex("washerId", { unique: true });
  }

  async readMemory(washer: WasherInstance): Promise<Memory> {
    const memory = await this.memory.findOne({ washerId: washer.id });
    return memory || {};
  }

  async writeMemory(washer: WasherInstance): Promise<void> {
    await this.memory.replaceOne(
      { washerId: washer.id },
      { $set: washer.memory },
      { upsert: true }
    );
  }
}
