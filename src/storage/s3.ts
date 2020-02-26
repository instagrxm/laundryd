import AWS from "aws-sdk";
import { ListObjectsV2Request } from "aws-sdk/clients/s3";
import { PromiseResult } from "aws-sdk/lib/request";
import filenamifyUrl from "filenamify-url";
import fs from "fs-extra";
import mime from "mime";
import path from "path";
import urlUtils from "url";
import { Log } from "../core/log";
import { Washer } from "../core/washers/washer";
import { Download, DownloadResult } from "./download";
import { FileStore } from "./fileStore";

export class S3 extends FileStore {
  static urlFormat =
    "S3 connection string should be s3://[AWS_KEY]:[AWS_SECRET]@[S3_BUCKET].s3-[S3_REGION].amazonaws.com";

  private s3!: AWS.S3;
  private bucket!: string;

  constructor(washer: Washer, connection: string) {
    const url = urlUtils.parse(connection, true);
    if (!url.auth || !url.hostname) {
      throw new Error(S3.urlFormat);
    }

    super(washer, connection, `https://${url.hostname}`);

    const parts = url.hostname.split(".");
    const endpoint = parts.slice(1).join(".");
    const bucket = parts[0];

    const [key, secret] = url.auth.split(":");
    if (!endpoint || !bucket || !key || !secret) {
      throw new Error(S3.urlFormat);
    }

    this.bucket = bucket;
    this.rootDir = washer.config.id;
    this.downloadsDir = path.join(this.rootDir, "downloads");
    this.stringsDir = path.join(this.rootDir, "strings");

    this.s3 = new AWS.S3({
      endpoint,
      accessKeyId: key,
      secretAccessKey: secret
    });
  }

  async validate(): Promise<void> {
    const permissions = await this.s3
      .getBucketAcl({ Bucket: this.bucket })
      .promise();
    if (
      !permissions.Grants ||
      !permissions.Grants.find(g => g.Permission === "FULL_CONTROL")
    ) {
      throw new Error(
        `improper bucket permissions for ${this.connection}: ${permissions}`
      );
    }
  }

  async existing(download: Download): Promise<DownloadResult | undefined> {
    const key = path.join(
      this.downloadsDir,
      Math.floor(download.item.date.getTime() / 1000).toString(),
      filenamifyUrl(download.url)
    );

    const result: DownloadResult = {
      item: download.item,
      dir: `/${key}/`,
      url: `${this.url}/${key}/`
    };

    try {
      const files = await this.s3
        .listObjectsV2({ Prefix: key, Bucket: this.bucket })
        .promise();
      if (!files.Contents) {
        return;
      }

      const keys = files.Contents.map(f => f.Key as string);

      if (download.json) {
        result.json = keys.find(f => f.match(/\.json$/));
        if (!result.json) {
          return;
        }
        result.json = path.parse(result.json).base;
        const contents = await this.s3
          .getObject({ Key: result.json, Bucket: this.bucket })
          .promise();
        result.data = JSON.parse((contents.Body as Buffer).toString());
      }

      if (download.image) {
        result.image = keys.find(f => f.match(/\.(jpg|jpeg|png|gif)$/));
        if (!result.image) {
          return;
        }
        result.image = path.parse(result.image).base;
      }

      if (download.media) {
        result.media = keys.find(f => !f.match(/\.(jpg|jpeg|png|gif|json)$/));
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
    const dir = filenamifyUrl(download.url);

    let source: string;
    const date = download.item.date;

    try {
      if (download.json) {
        source = path.join(download.dir, download.json);
        download.dir = await this.saveDownload(date, source, dir);
      }

      if (download.image) {
        source = path.join(download.dir, download.image);
        download.dir = await this.saveDownload(date, source, dir);
      }

      if (download.media) {
        source = path.join(download.dir, download.media);
        download.dir = await this.saveDownload(date, source, dir);
      }
    } catch (error) {
      await Log.error(this.washer, error);
    }

    download.dir = `/${download.dir}/`;
    download.url = `${this.url}${download.dir}`;
    return download;
  }

  async saveDownload(date: Date, local: string, dir = ""): Promise<string> {
    dir = path.join(
      this.downloadsDir,
      Math.floor(date.getTime() / 1000).toString(),
      dir
    );
    const file = path.join(dir, path.parse(local).base);

    const send = async (): Promise<AWS.S3.ManagedUpload.SendData> => {
      const params: AWS.S3.PutObjectRequest = {
        Bucket: this.bucket,
        Key: file,
        ContentType: mime.getType(file) || undefined,
        Body: fs.createReadStream(local),
        ACL: "public-read"
      };

      const response = await this.s3.upload(params).promise();
      await Log.info(this.washer, {
        event: "s3-upload",
        connection: this.connection,
        response
      });
      return response;
    };

    try {
      await send();
    } catch (error) {
      await Log.error(this.washer, {
        event: "s3-upload",
        connection: this.connection,
        error
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
      Prefix: this.downloadsDir
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

      const oldKeys = existing.Contents.map(c => c.Key as string).filter(
        key =>
          parseInt(key.replace(this.downloadsDir, "").split("/")[1], 10) <
          Math.floor(retainDate.getTime() / 1000)
      );

      for (const k of oldKeys) {
        const log = { event: "s3-delete", connection: this.connection, key: k };
        try {
          await Log.info(this.washer, log);
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

    const log = { event: "s3-save", connection: this.connection, key };
    try {
      await Log.info(this.washer, log);
      await this.s3
        .putObject({
          Bucket: this.bucket,
          Key: key,
          Body: data,
          ACL: "public-read",
          ContentType: mime.getType(file) || ""
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
      await Log.info(this.washer, {
        event: "s3-read",
        connection: this.connection,
        key
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
      await Log.info(this.washer, {
        event: "s3-delete",
        connection: this.connection,
        key
      });
    } catch (error) {
      return;
    }
  }
}
