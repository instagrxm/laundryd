import AWS from "aws-sdk";
import { ListObjectsV2Request } from "aws-sdk/clients/s3";
import { PromiseResult } from "aws-sdk/lib/request";
import fs from "fs-extra";
import { DateTime } from "luxon";
import mime from "mime";
import path from "path";
import urlUtils from "url";
import { Download, DownloadResult, Files, Log, Shared, Washer } from "../core";

export class S3Files extends Files {
  static urlFormat =
    "S3 connection string should be s3://[AWS_KEY]:[AWS_SECRET]@[S3_BUCKET].s3-[S3_REGION].amazonaws.com";

  private s3!: AWS.S3;
  private bucket!: string;

  constructor(washer: Washer, connection: string) {
    const url = urlUtils.parse(connection, true);
    if (!url.auth || !url.hostname) {
      throw new Error(S3Files.urlFormat);
    }

    // Remove auth so it doesn't appear in logs
    connection = connection.replace(`${url.auth}@`, "");
    super(washer, connection, `https://${url.hostname}`);

    const parts = url.hostname.split(".");
    const endpoint = parts.slice(1).join(".");
    const bucket = parts[0];

    const [key, secret] = url.auth.split(":");
    if (!endpoint || !bucket || !key || !secret) {
      throw new Error(S3Files.urlFormat);
    }

    this.bucket = bucket;
    this.rootDir = washer.config.id;
    this.downloadsDir = path.join(this.rootDir, this.downloadsPrefix);
    this.stringsDir = path.join(this.rootDir, this.stringsPrefix);

    this.s3 = new AWS.S3({
      endpoint,
      accessKeyId: key,
      secretAccessKey: secret,
    });
  }

  async validate(): Promise<void> {
    const permissions = await this.s3
      .getBucketAcl({ Bucket: this.bucket })
      .promise();
    if (
      !permissions.Grants ||
      !permissions.Grants.find((g) => g.Permission === "FULL_CONTROL")
    ) {
      throw new Error(
        `improper bucket permissions for ${this.connection}: ${permissions}`
      );
    }
  }

  async existing(download: Download): Promise<DownloadResult | undefined> {
    const key = path.join(
      this.downloadsDir,
      Math.floor(download.item.created.toSeconds()).toString(),
      Shared.urlToFilename(download.url)
    );

    const result: DownloadResult = {
      item: download.item,
      dir: key,
      url: `${this.url}/${key}`,
    };

    try {
      const files = await this.s3
        .listObjectsV2({ Prefix: key, Bucket: this.bucket })
        .promise();
      if (!files.Contents || !files.Contents.length) {
        return;
      }

      const keys = files.Contents.map((f) => f.Key as string);

      if (download.json) {
        result.json = keys.find((f) => path.parse(f).base === "data.json");
        if (!result.json) {
          return;
        }
        const contents = await this.s3
          .getObject({ Key: result.json, Bucket: this.bucket })
          .promise();
        result.data = JSON.parse((contents.Body as Buffer).toString());
        result.json = path.parse(result.json).base;
      }

      if (download.image) {
        result.image = keys.find((f) => path.parse(f).base.match(/^image/));
        if (!result.image) {
          return;
        }
        result.image = path.parse(result.image).base;
      }

      if (download.media || download.isDirect) {
        result.media = keys[0];
        if (!download.isDirect) {
          result.media = keys.find((f) => path.parse(f).base.match(/^media/));
        }

        if (!result.media) {
          return;
        }

        const stats = await this.s3
          .headObject({ Key: result.media, Bucket: this.bucket })
          .promise();
        result.media = path.parse(result.media).base;
        result.size = stats.ContentLength;
        result.type = stats.ContentType;
      }

      return result;
    } catch (error) {
      await Log.error(this.washer, error);
    }
  }

  async downloaded(download: DownloadResult): Promise<DownloadResult> {
    const dir = Shared.urlToFilename(download.url);

    let local: string;
    const date = download.item.created;
    let remoteDir = "";

    try {
      if (download.json) {
        local = path.join(download.dir, download.json);
        download.json = "data.json";
        remoteDir = await this.saveDownload(date, local, dir, download.json);
      }

      if (download.image) {
        local = path.join(download.dir, download.image);
        download.image = `image${path.parse(download.image).ext}`;
        remoteDir = await this.saveDownload(date, local, dir, download.image);
      }

      if (download.media) {
        local = path.join(download.dir, download.media);
        download.media = `media${path.parse(download.media).ext}`;
        remoteDir = await this.saveDownload(date, local, dir, download.media);
      }
    } catch (error) {
      await Log.error(this.washer, error);
    }

    download.dir = remoteDir;
    download.url = `${this.url}/${download.dir}`;
    return download;
  }

  async saveDownload(
    date: DateTime,
    local: string,
    dir: string,
    name: string
  ): Promise<string> {
    dir = path.join(
      this.downloadsDir,
      Math.floor(date.toSeconds()).toString(),
      dir
    );
    const file = path.join(dir, name);

    const send = async (): Promise<AWS.S3.ManagedUpload.SendData> => {
      const params: AWS.S3.PutObjectRequest = {
        Bucket: this.bucket,
        Key: file,
        ContentType: mime.getType(file) || undefined,
        Body: fs.createReadStream(local),
        ACL: "public-read",
      };

      const response = await this.s3.upload(params).promise();
      await Log.debug(this.washer, {
        msg: "s3-upload",
        connection: this.connection,
        response,
      });
      return response;
    };

    try {
      await send();
    } catch (error) {
      await Log.error(this.washer, {
        msg: "s3-upload",
        connection: this.connection,
        error,
      });
    }

    return dir;
  }

  async clean(): Promise<void> {
    const retainDate = this.washer.retainDate();
    if (!retainDate) {
      return;
    }

    const params: ListObjectsV2Request = {
      Bucket: this.bucket,
      Prefix: this.downloadsDir,
    };

    let token;

    while (true) {
      if (token) {
        params.ContinuationToken = token;
      }

      let existing!: PromiseResult<AWS.S3.ListObjectsV2Output, AWS.AWSError>;
      try {
        existing = await this.s3.listObjectsV2(params).promise();
      } catch (error) {
        await Log.error(this.washer, error);
      }

      if (!existing.Contents) {
        // Didn't get anything.
        break;
      }

      const oldKeys = existing.Contents.map((c) => c.Key as string).filter(
        (key) =>
          parseInt(key.replace(this.downloadsDir, "").split("/")[1], 10) <
          Math.floor(retainDate.toSeconds())
      );

      for (const k of oldKeys) {
        const log = { msg: "s3-delete", connection: this.connection, key: k };
        try {
          await Log.debug(this.washer, log);
          await this.s3.deleteObject({ Bucket: this.bucket, Key: k }).promise();
        } catch (error) {
          await Log.error(this.washer, { ...log, error });
        }
      }

      if (oldKeys.length < existing.Contents.length) {
        // Keys come back alphabetically, so if all on this page weren't deleted, there shouldn't be more to delete.
        break;
      }

      token = existing.NextContinuationToken;
      if (!token) {
        // No more pages to get.
        break;
      }
    }
  }

  async saveString(file: string, data: string): Promise<void> {
    if (!data) {
      return this.deleteString(file);
    }

    const key = path.join(this.stringsDir, file);

    const log = { msg: "s3-save", connection: this.connection, key };
    try {
      await Log.debug(this.washer, log);
      await this.s3
        .putObject({
          Bucket: this.bucket,
          Key: key,
          Body: data,
          ACL: "public-read",
          ContentType: mime.getType(file) || "",
        })
        .promise();
    } catch (error) {
      await Log.error(this.washer, { ...log, error });
    }
  }

  async readString(file: string): Promise<string | undefined> {
    const key = path.join(this.stringsDir, file);

    try {
      const result = await this.s3
        .getObject({ Bucket: this.bucket, Key: key })
        .promise();
      if (!result.Body) {
        return;
      }
      await Log.debug(this.washer, {
        msg: "s3-read",
        connection: this.connection,
        key,
      });
      return result.Body.toString();
    } catch (error) {
      return;
    }
  }

  async deleteString(file: string): Promise<void> {
    const key = path.join(this.stringsDir, file);

    try {
      await this.s3.deleteObject({ Bucket: this.bucket, Key: key }).promise();
      await Log.debug(this.washer, {
        msg: "s3-delete",
        connection: this.connection,
        key,
      });
    } catch (error) {
      return;
    }
  }
}
