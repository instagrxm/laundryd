const auth = {
  mixcloud: {
    key: process.env.MIXCLOUD_KEY,
    secret: process.env.MIXCLOUD_SECRET,
    token: process.env.MIXCLOUD_TOKEN
  },
  instagram: {
    username: process.env.INSTAGRAM_USERNAME,
    password: process.env.INSTAGRAM_PASSWORD
  },
  twitter: {
    key: process.env.TWITTER_KEY,
    secret: process.env.TWITTER_SECRET,
    token: process.env.TWITTER_TOKEN
  },
  soundcloud: {},
  youtube: {},
  vimeo: {
    key: process.env.VIMEO_KEY,
    secret: process.env.VIMEO_SECRET,
    token: process.env.VIMEO_TOKEN
  },
  feedbin: {
    username: process.env.FEEDBIN_USERNAME,
    password: process.env.FEEDBIN_PASSWORD
  },
  podcast: {},
  email: {}
};

const retention = {
  begin: 90,
  retain: 0
};

const schedule = {
  default: "* * * * * *"
};

const washers: any[] = [
  {
    id: "test/test-wash/foo",
    name: "test/test-wash",
    schedule: "*/5 * * * * *"
  },
  {
    id: "test/test-wash/bar",
    name: "test/test-wash",
    schedule: "*/5 * * * * *"
  },
  {
    name: "test/test-rinse",
    schedule: "*/5 * * * * *",
    retain: 1,
    subscribe: ["test/test-wash/foo", "test/test-wash/bar"]
  },
  {
    name: "test/test-dry",
    schedule: "*/5 * * * * *",
    subscribe: ["test/test-rinse"]
  }
  /*
  {
    name: "wash/mixcloud/uploads",
    schedule: schedule.default,
    auth: auth.mixcloud,
    begin: retention.begin,
    retain: retention.retain
  },
  {
    name: "wash/mixcloud/user",
    schedule: schedule.default,
    begin: retention.begin,
    retain: retention.retain,
    user: "redbullradio"
  },
  {
    name: "wash/instagram/timeline",
    schedule: schedule.default,
    auth: auth.instagram,
    begin: retention.begin,
    retain: retention.retain
  },
  {
    name: "wash/instagram/user",
    schedule: schedule.default,
    auth: auth.instagram,
    begin: retention.begin,
    retain: retention.retain,
    user: "foo"
  },
  {
    name: "wash/instagram/hashtag",
    schedule: schedule.default,
    auth: auth.instagram,
    begin: retention.begin,
    retain: retention.retain,
    hashtag: "foo"
  },
  {
    name: "wash/instagram/likes",
    schedule: schedule.default,
    auth: auth.instagram
  },
  {
    name: "wash/twitter/timeline",
    schedule: schedule.default,
    auth: auth.twitter,
    begin: retention.begin,
    retain: retention.retain
  },
  {
    name: "wash/twitter/user",
    schedule: schedule.default,
    auth: auth.twitter,
    begin: retention.begin,
    retain: retention.retain,
    user: "foo"
  },
  {
    name: "wash/twitter/list",
    schedule: schedule.default,
    auth: auth.twitter,
    begin: retention.begin,
    retain: retention.retain,
    list: "foo"
  },
  {
    name: "wash/twitter/hashtag",
    schedule: schedule.default,
    auth: auth.twitter,
    begin: retention.begin,
    retain: retention.retain,
    hashtag: "foo"
  },
  {
    name: "wash/twitter/likes",
    schedule: schedule.default,
    auth: auth.twitter
  },
  {
    name: "wash/soundcloud/user",
    schedule: schedule.default,
    user: "foo",
    auth: auth.soundcloud,
    begin: retention.begin,
    retain: retention.retain,
    media: "audio"
  },
  {
    name: "wash/soundcloud/playlist",
    schedule: schedule.default,
    playlist: "foo",
    auth: auth.soundcloud,
    begin: retention.begin,
    retain: retention.retain,
    media: "audio"
  },
  {
    name: "wash/soundcloud/timeline",
    schedule: schedule.default,
    auth: auth.soundcloud,
    begin: retention.begin,
    retain: retention.retain,
    media: "audio"
  },
  {
    name: "wash/youtube/subscribes",
    schedule: schedule.default,
    auth: auth.youtube,
    begin: retention.begin,
    retain: retention.retain
  },
  {
    name: "wash/youtube/channel",
    schedule: schedule.default,
    auth: auth.youtube,
    begin: retention.begin,
    retain: retention.retain,
    channel: "foo",
    media: "audio"
  },
  {
    name: "wash/youtube/playlist",
    schedule: schedule.default,
    auth: auth.youtube,
    begin: retention.begin,
    retain: retention.retain,
    playlist: "foo",
    media: "video"
  },
  {
    name: "wash/vimeo/timeline",
    schedule: schedule.default,
    auth: auth.vimeo,
    begin: retention.begin,
    retain: retention.retain
  },
  {
    name: "wash/vimeo/channel",
    schedule: schedule.default,
    channel: "foo",
    auth: auth.vimeo,
    begin: retention.begin,
    retain: retention.retain
  },
  {
    name: "wash/vimeo/group",
    schedule: schedule.default,
    group: "foo",
    auth: auth.vimeo,
    begin: retention.begin,
    retain: retention.retain
  },
  {
    name: "wash/vimeo/user",
    schedule: schedule.default,
    user: "foo",
    auth: auth.vimeo,
    begin: retention.begin,
    retain: retention.retain
  },
  {
    name: "wash/feedbin/likes",
    schedule: schedule.default,
    auth: auth.feedbin
  },
  {
    name: "dry/feedbin/unlike",
    subscribe: ["wash/feedbin/likes"],
    auth: auth.feedbin
  },
  {
    name: "wash/podcast/likes",
    schedule: schedule.default,
    auth: auth.podcast
  },
  {
    name: "dry/podcast/unlike",
    subscribe: ["wash/podcast/likes"],
    auth: auth.podcast
  },
  {
    name: "dry/instagram/like",
    subscribe: ["wash/feedbin/likes"],
    auth: auth.instagram
  },
  {
    id: "dry/youtube/like/feedbin",
    name: "dry/youtube/like",
    subscribe: ["wash/feedbin/likes"],
    auth: auth.youtube
  },
  {
    name: "dry/vimeo/like",
    subscribe: ["wash/feedbin/likes"],
    auth: auth.vimeo
  },
  {
    name: "dry/twitter/like",
    subscribe: ["wash/feedbin/likes"],
    auth: auth.twitter
  },
  {
    id: "dry/youtube/like/podcast",
    name: "dry/youtube/like",
    subscribe: ["wash/podcast/likes"],
    auth: auth.youtube
  },
  {
    name: "dry/soundcloud/like",
    subscribe: ["wash/podcast/likes"],
    auth: auth.soundcloud
  },
  {
    name: "dry/mixcloud/like",
    subscribe: ["wash/podcast/likes"],
    auth: auth.soundcloud
  },
  {
    name: "dry/instagram/story",
    subscribe: ["wash/instagram/likes"],
    auth: auth.instagram
  },
  {
    name: "dry/twitter/tweet",
    subscribe: ["wash/instagram/user"],
    auth: auth.twitter
  },
  {
    name: "dry/email",
    subscribe: ["log/error"],
    to: "foo",
    auth: auth.email
  }
  */
];

washers.forEach(w => (w.id = w.id || w.name));

export = washers;
