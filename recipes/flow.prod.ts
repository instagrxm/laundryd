const schedule = {
  twelve: "0 */5 * * * *", // 12x/hr
  three: "0 */20 * * * *", // 3x/hr
  morning: "0 0 13 * * *", // 6am
  midnight: "0 0 7 * * *", // midnight
};

const washers: any[] = [
  {
    name: "process/stdout",
    color: false,
    compact: true,
    subscribe: ["log"],
    filter: { level: { $in: ["debug", "info", "warn", "error"] } },
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
    filter: { level: "error" },
  },
  {
    name: "maintenance/mongoBackup",
  },
  {
    name: "maintenance/upgradeTools",
  },
  {
    name: "maintenance/clearCache",
  },
  {
    name: "instagram/timeline",
    download: true,
    begin: 14,
    retain: 14,
    schedule: schedule.three,
    username: process.env.INSTAGRAM_USER,
    password: process.env.INSTAGRAM_PASS,
  },
  {
    name: "feed/rss",
    id: "instagram/rss",
    schedule: "0 5,25,35,45 * * * *",
    subscribe: ["instagram/timeline"],
  },
  {
    name: "mixcloud/timeline",
    schedule: schedule.morning,
    download: true,
    begin: 90,
    retain: 90,
    clientId: process.env.MIXCLOUD_CLIENTID,
    clientSecret: process.env.MIXCLOUD_CLIENTSECRET,
    token: process.env.MIXCLOUD_TOKEN,
  },
  {
    name: "feed/podcast",
    id: "mixcloud/podcast",
    days: 90,
    subscribe: ["mixcloud/timeline"],
  },
  {
    id: "mixcloud/handlebars",
    name: "format/handlebars",
    subscribe: ["mixcloud/timeline"],
    html: `
      <div><strong><a href="{{url}}">{{title}}</a></strong></div>
      <div><img src="{{image}}" /></div>
      <div>{{{html}}}</div>
      <div>{{#each meta.tags}}{{name}}{{#unless @last}}, {{/unless}}{{/each}}</div>
    `,
  },
  {
    id: "mixcloud/email",
    name: "email/smtp",
    smtpHost: process.env.SMTP_HOST,
    smtpUser: process.env.SMTP_USER,
    smtpPass: process.env.SMTP_PASS,
    from: "laundry@endquote.com",
    to: "josh@endquote.com",
    attachData: true,
    attachImage: true,
    subscribe: ["mixcloud/handlebars"],
  },
  {
    name: "feedbin/liked",
    schedule: schedule.three,
    username: process.env.FEEDBIN_USER,
    password: process.env.FEEDBIN_PASS,
  },
  {
    name: "instagram/like",
    username: process.env.INSTAGRAM_USER,
    password: process.env.INSTAGRAM_PASS,
    subscribe: ["feedbin/liked"],
  },
  {
    name: "instagram/liked",
    schedule: schedule.midnight,
    username: process.env.INSTAGRAM_USER,
    password: process.env.INSTAGRAM_PASS,
  },
  {
    name: "instagram/saved",
    schedule: schedule.three,
    username: process.env.INSTAGRAM_USER,
    password: process.env.INSTAGRAM_PASS,
  },
  {
    name: "instagram/story",
    username: process.env.INSTAGRAM_USER,
    password: process.env.INSTAGRAM_PASS,
    subscribe: ["instagram/saved"],
  },
];

export = washers;
