const schedule = {
  default: "0 * * * * *",
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
    // enabled: false,
    name: "mixcloud/user",
    user: "redbullradio",
    schedule: schedule.default,
    download: true,
    begin: 10,
    retain: 0
  },
  {
    // enabled: false,
    name: "mixcloud/likes",
    schedule: schedule.default,
    download: true,
    begin: 0,
    retain: 0,
    clientId: process.env.MIXCLOUD_CLIENTID,
    clientSecret: process.env.MIXCLOUD_CLIENTSECRET,
    token: process.env.MIXCLOUD_TOKEN
  },
  {
    // enabled: false,
    name: "mixcloud/like",
    clientId: process.env.MIXCLOUD_CLIENTID,
    clientSecret: process.env.MIXCLOUD_CLIENTSECRET,
    token: process.env.MIXCLOUD_TOKEN,
    subscribe: ["mixcloud/likes"]
  },
  {
    // enabled: false,
    name: "mixcloud/timeline",
    schedule: schedule.default,
    download: true,
    begin: 10,
    retain: 0,
    clientId: process.env.MIXCLOUD_CLIENTID,
    clientSecret: process.env.MIXCLOUD_CLIENTSECRET,
    token: process.env.MIXCLOUD_TOKEN
  },
  {
    // enabled: false,
    name: "feed/rss",
    title: "mixcloud combined",
    schedule: schedule.default,
    subscribe: ["mixcloud/user", "mixcloud/timeline", "mixcloud/likes"]
  },
  {
    // enabled: false,
    name: "feed/podcast",
    title: "mixcloud combined",
    schedule: schedule.default,
    ownerName: "Josh Santangelo",
    ownerEmail: "josh@endquote.com",
    category: "Music",
    subcategory: "Music Commentary",
    subscribe: ["mixcloud/user", "mixcloud/timeline", "mixcloud/likes"]
  },
  {
    enabled: false,
    id: "mixcloud/jsx",
    name: "format/jsx",
    subscribe: ["mixcloud/user", "mixcloud/timeline", "mixcloud/likes"],
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
    subscribe: ["mixcloud/user", "mixcloud/timeline", "mixcloud/likes"],
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
  }
];

washers.forEach(w => (w.id = w.id || w.name));

export = washers;
