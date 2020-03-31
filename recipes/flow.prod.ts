const schedule = {
  default: "*/5 * * * * *",
  daily: "0 0 0 * * *"
};

const washers: any[] = [
  {
    name: "process/stdout",
    color: true,
    subscribe: ["log"],
    filter: { level: { $in: ["debug", "info", "warn", "error"] } }
  },
  {
    name: "email/smtp",
    smtpHost: process.env.SMTP_HOST,
    smtpUser: process.env.SMTP_USER,
    smtpPass: process.env.SMTP_PASS,
    from: "laundry@endquote.com",
    to: "josh@endquote.com",
    attachData: true,
    subscribe: ["log"],
    filter: { level: "error" }
  },
  {
    name: "maintenance/mongoBackup"
  },
  {
    name: "maintenance/upgradeTools"
  },
  {
    name: "maintenance/clearCache"
  },
  {
    name: "instagram/timeline",
    download: true,
    begin: 14,
    retain: 14,
    schedule: "0 0,20,30,40 * * * *",
    username: process.env.INSTAGRAM_USER,
    password: process.env.INSTAGRAM_PASS,
    code: 430251
  },
  {
    name: "feed/rss",
    id: "instagram/rss",
    schedule: "0 5,25,35,45 * * * *",
    subscribe: ["instagram/timeline"]
  }
];

export = washers;
