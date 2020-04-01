const schedule = {
  default: "*/5 * * * * *",
  daily: "0 0 0 * * *"
};

const washers: any[] = [
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
    enabled: false,
    name: "mixcloud/user",
    user: "redbullradio",
    schedule: schedule.default,
    download: true,
    begin: 10,
    retain: 0
  },
  {
    enabled: false,
    name: "mixcloud/liked",
    schedule: schedule.default,
    download: true,
    begin: 0,
    retain: 0,
    clientId: process.env.MIXCLOUD_CLIENTID,
    clientSecret: process.env.MIXCLOUD_CLIENTSECRET,
    token: process.env.MIXCLOUD_TOKEN
  },
  {
    enabled: false,
    name: "mixcloud/like",
    clientId: process.env.MIXCLOUD_CLIENTID,
    clientSecret: process.env.MIXCLOUD_CLIENTSECRET,
    token: process.env.MIXCLOUD_TOKEN,
    subscribe: ["mixcloud/liked"]
  },
  {
    // enabled: false,
    name: "mixcloud/timeline",
    schedule: schedule.default,
    download: true,
    begin: 1,
    retain: 90,
    clientId: process.env.MIXCLOUD_CLIENTID,
    clientSecret: process.env.MIXCLOUD_CLIENTSECRET,
    token: process.env.MIXCLOUD_TOKEN
  },
  {
    enabled: false,
    name: "feed/podcast",
    title: "mixcloud combined",
    schedule: schedule.default,
    ownerName: "Josh Santangelo",
    ownerEmail: "josh@endquote.com",
    category: "Music",
    subcategory: "Music Commentary",
    subscribe: ["mixcloud/timeline"]
  },
  {
    enabled: false,
    id: "mixcloud/jsx",
    name: "format/jsx",
    subscribe: ["mixcloud/timeline"],
    html: `
      <div><strong>{item.title}</strong></div>
      <div><img src={item.image} /></div>
      <div dangerouslySetInnerHTML={{__html:item.html}} />
      <div>{item.meta.tags.join(',')}</div>
    `
  },
  {
    // enabled: false,
    id: "mixcloud/handlebars",
    name: "format/handlebars",
    subscribe: ["mixcloud/timeline"],
    html: `
      <div><strong><a href="{{url}}">{{title}}</a></strong></div>
      <div><img src="{{image}}" /></div>
      <div>{{{html}}}</div>
      <div>{{#each meta.tags}}{{name}}{{#unless @last}}, {{/unless}}{{/each}}</div>
    `
  },
  {
    // enabled: false,
    id: "mixcloud/email",
    name: "email/smtp",
    smtpHost: process.env.SMTP_HOST,
    smtpUser: process.env.SMTP_USER,
    smtpPass: process.env.SMTP_PASS,
    from: "laundry@endquote.com",
    to: "josh@endquote.com",
    attachData: true,
    attachImage: true,
    // schedule: schedule.default,
    subscribe: ["mixcloud/handlebars"]
  },
  {
    enabled: false,
    name: "instagram/timeline",
    download: true,
    // user: "danielarsham",
    // tag: "covidchic",
    // locationId: 1031402212,
    begin: 14,
    schedule: schedule.default,
    username: process.env.INSTAGRAM_USER,
    password: process.env.INSTAGRAM_PASS
  },
  {
    enabled: false,
    name: "instagram/like",
    // schedule: schedule.default,
    username: process.env.INSTAGRAM_USER,
    password: process.env.INSTAGRAM_PASS,
    filter: { url: { $regex: "B-XdztZDTLq" } },
    subscribe: ["feedbin/liked"]
  },
  {
    enabled: false,
    name: "feedbin/liked",
    schedule: schedule.default,
    username: process.env.FEEDBIN_USER,
    password: process.env.FEEDBIN_PASS
  },
  {
    enabled: false,
    name: "test/testDry",
    // schedule: schedule.default,
    filter: {
      url: { $regex: "^http(s)?:\\/\\/(www.)?instagram.com", $options: "i" }
    },
    subscribe: ["feedbin/liked"]
  },
  {
    enabled: false,
    name: "feedbin/like",
    // schedule: schedule.default,
    state: true,
    filter: { url: { $regex: "vox.com" } },
    username: process.env.FEEDBIN_USER,
    password: process.env.FEEDBIN_PASS,
    subscribe: ["feedbin/search"]
  },
  {
    enabled: false,
    name: "feedbin/save",
    schedule: schedule.default,
    username: process.env.FEEDBIN_USER,
    password: process.env.FEEDBIN_PASS,
    subscribe: ["feedbin/search"]
  },
  {
    enabled: false,
    name: "feedbin/search",
    begin: 1,
    schedule: schedule.default,
    search: "instagram",
    username: process.env.FEEDBIN_USER,
    password: process.env.FEEDBIN_PASS
  },
  {
    enabled: false,
    name: "feedbin/saved",
    begin: 10,
    schedule: schedule.default,
    username: process.env.FEEDBIN_USER,
    password: process.env.FEEDBIN_PASS
  }
];

export = washers;
