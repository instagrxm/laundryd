import { OutputFlags } from "@oclif/parser/lib/parse";
import childProcess from "child_process";
import fs from "fs-extra";
import { DateTime } from "luxon";
import path from "path";
import util from "util";
import { Config } from "../../core/config";
import { Log } from "../../core/log";
import { SharedFlags } from "../../core/sharedFlags";
import { Fix } from "../../core/washers/fix";

const exec = util.promisify(childProcess.exec);

export class BackupDatabase extends Fix {
  static readonly title: string = "fix/backupDatabase";
  static readonly description: string = "dump the database to the file store";

  static flags = {
    ...Fix.flags,
    mongo: SharedFlags.mongo()
  };

  config!: OutputFlags<typeof BackupDatabase.flags>;

  async init(): Promise<void> {
    try {
      await exec("mongodump --version");
    } catch (error) {
      throw new Error(`couldn't find mongodump: ${error.message}`);
    }

    await super.init();
  }

  async run(): Promise<void> {
    const localDir = Config.config.cacheDir;
    const file = "mongo.dump";

    await Log.info(this, { msg: "dumping database" });
    const dump = `mongodump --uri=${this.config.mongo} --archive=${localDir}`;
    await exec(dump);

    await Log.info(this, { msg: "saving dump file" });
    const dir = await this.fileStore.saveDownload(
      DateTime.utc(),
      path.join(localDir, file)
    );

    const url = `${this.fileStore.url}/${dir}/${file}`;
    await Log.info(this, { msg: `backup available at ${url}` });

    await fs.remove(localDir);
  }
}
