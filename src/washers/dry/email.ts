import { flags } from "@oclif/command";
import { OutputFlags } from "@oclif/parser/lib/parse";
import nodemailer from "nodemailer";
import Mail, { Attachment } from "nodemailer/lib/mailer";
import path from "path";
import { LoadedItem } from "../../core/item";
import { Settings } from "../../core/settings";
import { Dry } from "../../core/washers/dry";
import { WasherInfo } from "../../core/washers/washerInfo";
import { Database } from "../../storage/database";

export class Email extends Dry {
  static readonly info = new WasherInfo({
    title: "email",
    description: "send items via email using an SMTP service",
    memory: false
  });

  static settings = {
    ...Dry.settings,

    smtpHost: flags.string({
      required: true,
      description: "hostname for SMTP service"
    }),

    smtpPort: flags.integer({
      required: true,
      default: 465,
      description: "the port to connect to the SMTP service on"
    }),

    smtpUser: flags.string({
      required: true,
      description: "username for SMTP service"
    }),

    smtpPass: flags.string({
      required: true,
      description: "password for SMTP service"
    }),

    from: flags.string({
      required: true,
      description: "address that emails should come from"
    }),

    to: flags.build<string[]>({
      required: true,
      parse: (input: string) => {
        if (!input || !(typeof input === "string")) {
          throw new Error("missing to");
        }
        return input.split(",");
      },
      description: "send messages to these addresses"
    })(),

    cc: flags.build<string[]>({
      required: true,
      parse: (input: string) => {
        if (!input || !(typeof input === "string")) {
          throw new Error("missing to");
        }
        return input.split(",");
      },
      description: "cc these addresses"
    })(),

    attachData: Settings.boolean({
      default: false,
      description: "whether to attach items as JSON files"
    }),

    attachImage: Settings.boolean({
      default: false,
      description: "whether to attach item image files"
    }),

    attachMedia: Settings.boolean({
      default: false,
      description: "whether to attach item media files"
    })
  };

  config!: OutputFlags<typeof Email.settings>;

  private smtp!: Mail;

  async init(): Promise<void> {
    this.smtp = nodemailer.createTransport({
      host: this.config.smtpHost,
      port: this.config.smtpPort,
      secure: this.config.smtpPort === 465,
      auth: {
        user: this.config.smtpUser,
        pass: this.config.smtpPass
      }
    });
  }

  async run(items: LoadedItem[]): Promise<void> {
    for (const item of items) {
      await this.sendItem(item);
    }
  }

  async sendItem(item: LoadedItem): Promise<void> {
    const attachments: Attachment[] = [];

    if (this.config.attachData) {
      attachments.push({
        filename: item.created.toFormat("yyyyMMddHHmmss") + ".json",
        content: JSON.stringify(Database.dehydrateItem(item), null, 2)
      });
    }

    if (this.config.attachImage && item.image) {
      attachments.push({
        filename: path.parse(item.image).base,
        path: item.image
      });
    }

    if (this.config.attachMedia && item.media) {
      attachments.push({
        filename: path.parse(item.media.file).base,
        contentType: item.media.type,
        path: item.media.file
      });
    }

    const subject = item.title || item.washerId;
    const text = item.text || item.html || "";
    const html = item.html || item.text || "";

    const mail: Mail.Options = {
      from: this.config.from,
      to: this.config.to,
      cc: this.config.cc,
      subject: subject.trim(),
      text: text.trim(),
      html: `<div>${html}</div>`,
      attachments
    };

    await this.smtp.sendMail(mail);
  }
}
