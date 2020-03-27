import { OutputFlags } from "@oclif/parser/lib/parse";
import childProcess from "child_process";
import fs from "fs-extra";
import { DateTime } from "luxon";
import path from "path";
import util from "util";
import { Config, Fix, Log, WasherInfo } from "../../core";

const exec = util.promisify(childProcess.exec);

export class BackupDatabase extends Fix {
  static readonly info = new WasherInfo({
    title: "back up database",
    description: "dump the database to the file store"
  });

  static settings = {
    ...Fix.settings
  };

  config!: OutputFlags<typeof BackupDatabase.settings>;

  async init(): Promise<void> {
    try {
      await exec("mongodump --version");
    } catch (error) {
      throw new Error(`couldn't find mongodump: ${error.message}`);
    }
  }

  async run(): Promise<void> {
    const localDir = path.join(Config.config.cacheDir, this.config.id);
    await fs.ensureDir(localDir);
    const file = "mongo.dump";
    const dest = path.join(localDir, file);

    const cmd = `mongodump --uri=${Config.flags.database} --archive=${dest}`;
    await Log.debug(this, { msg: "dumping database", cmd });
    await exec(cmd);

    await Log.debug(this, { msg: "saving dump file", dest });
    const dir = await this.files.saveDownload(
      DateTime.utc(),
      dest,
      "",
      "mongo.dump"
    );

    const url = `${this.files.url}/${dir}/${file}`;
    await Log.debug(this, { msg: "backup complete", url });

    await fs.remove(localDir);
  }
}
