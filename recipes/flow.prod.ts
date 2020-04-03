const schedule = {
  twelve: "0 */5 * * * *", // 12x/hr
  three: "0 */20 * * * *", // 3x/hr
  morning: "0 0 13 * * *", // 6am
  midnight: "0 0 7 * * *", // 12am
};

const washers: any[] = [
  {
    // log messages to the console
    name: "process/stdout",
    color: false,
    compact: true,
    subscribe: ["log"],
    filter: { level: { $in: ["debug", "info", "warn", "error"] } },
  },
  {
    // send errors by email
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
    // back up the database every two hours
    schedule: "0 0 */2 * * *",
    name: "maintenance/mongoBackup",
  },
  {
    // upgrade media tools daily
    name: "maintenance/upgradeTools",
  },
  {
    // clear unfinished downloads daily
    name: "maintenance/clearCache",
  },
  {
    // save my instagram timeline
    name: "instagram/timeline",
    download: true,
    begin: 14,
    retain: 14,
    schedule: schedule.three,
    username: process.env.INSTAGRAM_USER,
    password: process.env.INSTAGRAM_PASS,
  },
  {
    // convert my instagram timeline to rss
    name: "feed/rss",
    id: "instagram/rss",
    schedule: "0 5,25,35,45 * * * *",
    subscribe: ["instagram/timeline"],
  },
  {
    // save my mixcloud timeline
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
    // convert my mixcloud timeline to a podcast
    name: "feed/podcast",
    id: "mixcloud/timeline/podcast",
    days: 90,
    subscribe: ["mixcloud/timeline"],
  },
  {
    // format posts on my mixcloud timeline
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
    // email the formatted mixcloud posts
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
    // save things i like on feedbin
    name: "feedbin/liked",
    schedule: schedule.three,
    username: process.env.FEEDBIN_USER,
    password: process.env.FEEDBIN_PASS,
  },
  {
    // if i like an instagram post on feedbin, like it on instagram
    name: "instagram/like",
    username: process.env.INSTAGRAM_USER,
    password: process.env.INSTAGRAM_PASS,
    subscribe: ["feedbin/liked"],
  },
  {
    // if i like an instagram post on feedbin, unlike it
    name: "feedbin/like",
    state: false,
    filter: {
      url: { $regex: "^http(s)?:\\/\\/(www.)?instagram.com", $options: "i" },
    },
    username: process.env.FEEDBIN_USER,
    password: process.env.FEEDBIN_PASS,
    subscribe: ["feedbin/liked"],
  },
  {
    // save things i like on instagram
    enabled: false,
    name: "instagram/liked",
    // schedule: schedule.midnight,
    schedule: "0 20 * * * *",
    begin: 30,
    username: process.env.INSTAGRAM_USER,
    password: process.env.INSTAGRAM_PASS,
  },
  {
    // save things i save on instagram
    name: "instagram/saved",
    schedule: schedule.three,
    username: process.env.INSTAGRAM_USER,
    password: process.env.INSTAGRAM_PASS,
  },
  {
    // if i save something on instagram, post it to my instagram story
    name: "instagram/story",
    username: process.env.INSTAGRAM_USER,
    password: process.env.INSTAGRAM_PASS,
    subscribe: ["instagram/saved"],
  },
  {
    // download all of soulection radio show
    name: "soundcloud/playlist",
    id: "soundcloud/soulection",
    playlist:
      "https://soundcloud.com/soulection/sets/soulection-radio-sessions",
    // schedule: schedule.morning,
    schedule: "0 30 * * * *",
    download: true,
    begin: 0,
    clientId: process.env.SOUNDCLOUD_CLIENTID,
    clientSecret: process.env.SOUNDCLOUD_CLIENTSECRET,
    token: process.env.SOUNDCLOUD_TOKEN,
  },
  {
    // make a podcast out of soulection radio show
    name: "feed/podcast",
    id: "soundcloud/soulection/podcast",
    days: 0,
    subscribe: ["soundcloud/soulection"],
  },
  {
    // download items from the soundcloud timeline
    name: "soundcloud/timeline",
    // schedule: schedule.morning,
    schedule: "0 30 * * * *",
    download: true,
    begin: 30,
    retain: 30,
    clientId: process.env.SOUNDCLOUD_CLIENTID,
    clientSecret: process.env.SOUNDCLOUD_CLIENTSECRET,
    token: process.env.SOUNDCLOUD_TOKEN,
  },
  {
    // make a podcast out of the soundcloud timeline
    name: "feed/podcast",
    days: 30,
    id: "soundcloud/timeline/podcast",
    subscribe: ["soundcloud/timeline"],
  },
];

export = washers;
