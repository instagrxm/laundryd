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
    enabled: false,
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

  // {
  //   name: "wash/instagram/timeline",
  //   schedule: schedule.default,
  //   auth: auth.instagram,
  //   begin: retention.begin,
  //   retain: retention.retain
  // },
  // {
  //   name: "wash/instagram/user",
  //   schedule: schedule.default,
  //   auth: auth.instagram,
  //   begin: retention.begin,
  //   retain: retention.retain,
  //   user: "foo"
  // },
  // {
  //   name: "wash/instagram/hashtag",
  //   schedule: schedule.default,
  //   auth: auth.instagram,
  //   begin: retention.begin,
  //   retain: retention.retain,
  //   hashtag: "foo"
  // },
  // {
  //   name: "wash/instagram/likes",
  //   schedule: schedule.default,
  //   auth: auth.instagram
  // },
  // {
  //   name: "wash/twitter/timeline",
  //   schedule: schedule.default,
  //   auth: auth.twitter,
  //   begin: retention.begin,
  //   retain: retention.retain
  // },
  // {
  //   name: "wash/twitter/user",
  //   schedule: schedule.default,
  //   auth: auth.twitter,
  //   begin: retention.begin,
  //   retain: retention.retain,
  //   user: "foo"
  // },
  // {
  //   name: "wash/twitter/list",
  //   schedule: schedule.default,
  //   auth: auth.twitter,
  //   begin: retention.begin,
  //   retain: retention.retain,
  //   list: "foo"
  // },
  // {
  //   name: "wash/twitter/hashtag",
  //   schedule: schedule.default,
  //   auth: auth.twitter,
  //   begin: retention.begin,
  //   retain: retention.retain,
  //   hashtag: "foo"
  // },
  // {
  //   name: "wash/twitter/likes",
  //   schedule: schedule.default,
  //   auth: auth.twitter
  // },
  // {
  //   name: "wash/soundcloud/user",
  //   schedule: schedule.default,
  //   user: "foo",
  //   auth: auth.soundcloud,
  //   begin: retention.begin,
  //   retain: retention.retain,
  //   media: "audio"
  // },
  // {
  //   name: "wash/soundcloud/playlist",
  //   schedule: schedule.default,
  //   playlist: "foo",
  //   auth: auth.soundcloud,
  //   begin: retention.begin,
  //   retain: retention.retain,
  //   media: "audio"
  // },
  // {
  //   name: "wash/soundcloud/timeline",
  //   schedule: schedule.default,
  //   auth: auth.soundcloud,
  //   begin: retention.begin,
  //   retain: retention.retain,
  //   media: "audio"
  // },
  // {
  //   name: "wash/youtube/subscribes",
  //   schedule: schedule.default,
  //   auth: auth.youtube,
  //   begin: retention.begin,
  //   retain: retention.retain
  // },
  // {
  //   name: "wash/youtube/channel",
  //   schedule: schedule.default,
  //   auth: auth.youtube,
  //   begin: retention.begin,
  //   retain: retention.retain,
  //   channel: "foo",
  //   media: "audio"
  // },
  // {
  //   name: "wash/youtube/playlist",
  //   schedule: schedule.default,
  //   auth: auth.youtube,
  //   begin: retention.begin,
  //   retain: retention.retain,
  //   playlist: "foo",
  //   media: "video"
  // },
  // {
  //   name: "wash/vimeo/timeline",
  //   schedule: schedule.default,
  //   auth: auth.vimeo,
  //   begin: retention.begin,
  //   retain: retention.retain
  // },
  // {
  //   name: "wash/vimeo/channel",
  //   schedule: schedule.default,
  //   channel: "foo",
  //   auth: auth.vimeo,
  //   begin: retention.begin,
  //   retain: retention.retain
  // },
  // {
  //   name: "wash/vimeo/group",
  //   schedule: schedule.default,
  //   group: "foo",
  //   auth: auth.vimeo,
  //   begin: retention.begin,
  //   retain: retention.retain
  // },
  // {
  //   name: "wash/vimeo/user",
  //   schedule: schedule.default,
  //   user: "foo",
  //   auth: auth.vimeo,
  //   begin: retention.begin,
  //   retain: retention.retain
  // },
  // {
  //   name: "wash/feedbin/likes",
  //   schedule: schedule.default,
  //   auth: auth.feedbin
  // },
  // {
  //   name: "dry/feedbin/unlike",
  //   subscribe: ["wash/feedbin/likes"],
  //   auth: auth.feedbin
  // },
  // {
  //   name: "wash/podcast/likes",
  //   schedule: schedule.default,
  //   auth: auth.podcast
  // },
  // {
  //   name: "dry/podcast/unlike",
  //   subscribe: ["wash/podcast/likes"],
  //   auth: auth.podcast
  // },
  // {
  //   name: "dry/instagram/like",
  //   subscribe: ["wash/feedbin/likes"],
  //   auth: auth.instagram
  // },
  // {
  //   id: "dry/youtube/like/feedbin",
  //   name: "dry/youtube/like",
  //   subscribe: ["wash/feedbin/likes"],
  //   auth: auth.youtube
  // },
  // {
  //   name: "dry/vimeo/like",
  //   subscribe: ["wash/feedbin/likes"],
  //   auth: auth.vimeo
  // },
  // {
  //   name: "dry/twitter/like",
  //   subscribe: ["wash/feedbin/likes"],
  //   auth: auth.twitter
  // },
  // {
  //   id: "dry/youtube/like/podcast",
  //   name: "dry/youtube/like",
  //   subscribe: ["wash/podcast/likes"],
  //   auth: auth.youtube
  // },
  // {
  //   name: "dry/soundcloud/like",
  //   subscribe: ["wash/podcast/likes"],
  //   auth: auth.soundcloud
  // },
  // {
  //   name: "dry/mixcloud/like",
  //   subscribe: ["wash/podcast/likes"],
  //   auth: auth.soundcloud
  // },
  // {
  //   name: "dry/instagram/story",
  //   subscribe: ["wash/instagram/likes"],
  //   auth: auth.instagram
  // },
  // {
  //   name: "dry/twitter/tweet",
  //   subscribe: ["wash/instagram/user"],
  //   auth: auth.twitter
  // },
  // {
  //   name: "dry/email",
  //   subscribe: ["log/error"],
  //   to: "foo",
  //   auth: auth.email
  // }
];

washers.forEach(w => (w.id = w.id || w.name));

export = washers;
