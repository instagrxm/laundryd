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
    name: "maintenance/upgradeTools",
  },
  {
    name: "maintenance/clearCache",
  },
];

export = washers;
