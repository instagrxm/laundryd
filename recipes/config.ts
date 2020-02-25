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
    title: "test/test-wash",
    id: "test/test-wash/foo",
    schedule: "*/5 * * * * *",
    retain: 1
  },
  // {
  //   title: "test/test-wash",
  //   id: "test/test-wash/bar",
  //   schedule: "*/5 * * * * *"
  // },
  // {
  //   title: "test/test-rinse",
  //   schedule: "*/5 * * * * *",
  //   retain: 1,
  //   subscribe: ["test/test-wash/foo", "test/test-wash/bar"]
  // },
  // {
  //   title: "test/test-dry",
  //   schedule: "*/5 * * * * *",
  //   subscribe: ["test/test-rinse"]
  // },
  {
    title: "stdout",
    subscribe: ["log"],
    color: true,
    levels: "debug"
  }
  /*
  {
    title: "wash/mixcloud/uploads",
    schedule: schedule.default,
    auth: auth.mixcloud,
    begin: retention.begin,
    retain: retention.retain
  },
  {
    title: "wash/mixcloud/user",
    schedule: schedule.default,
    begin: retention.begin,
    retain: retention.retain,
    user: "redbullradio"
  },
  {
    title: "wash/instagram/timeline",
    schedule: schedule.default,
    auth: auth.instagram,
    begin: retention.begin,
    retain: retention.retain
  },
  {
    title: "wash/instagram/user",
    schedule: schedule.default,
    auth: auth.instagram,
    begin: retention.begin,
    retain: retention.retain,
    user: "foo"
  },
  {
    title: "wash/instagram/hashtag",
    schedule: schedule.default,
    auth: auth.instagram,
    begin: retention.begin,
    retain: retention.retain,
    hashtag: "foo"
  },
  {
    title: "wash/instagram/likes",
    schedule: schedule.default,
    auth: auth.instagram
  },
  {
    title: "wash/twitter/timeline",
    schedule: schedule.default,
    auth: auth.twitter,
    begin: retention.begin,
    retain: retention.retain
  },
  {
    title: "wash/twitter/user",
    schedule: schedule.default,
    auth: auth.twitter,
    begin: retention.begin,
    retain: retention.retain,
    user: "foo"
  },
  {
    title: "wash/twitter/list",
    schedule: schedule.default,
    auth: auth.twitter,
    begin: retention.begin,
    retain: retention.retain,
    list: "foo"
  },
  {
    title: "wash/twitter/hashtag",
    schedule: schedule.default,
    auth: auth.twitter,
    begin: retention.begin,
    retain: retention.retain,
    hashtag: "foo"
  },
  {
    title: "wash/twitter/likes",
    schedule: schedule.default,
    auth: auth.twitter
  },
  {
    title: "wash/soundcloud/user",
    schedule: schedule.default,
    user: "foo",
    auth: auth.soundcloud,
    begin: retention.begin,
    retain: retention.retain,
    media: "audio"
  },
  {
    title: "wash/soundcloud/playlist",
    schedule: schedule.default,
    playlist: "foo",
    auth: auth.soundcloud,
    begin: retention.begin,
    retain: retention.retain,
    media: "audio"
  },
  {
    title: "wash/soundcloud/timeline",
    schedule: schedule.default,
    auth: auth.soundcloud,
    begin: retention.begin,
    retain: retention.retain,
    media: "audio"
  },
  {
    title: "wash/youtube/subscribes",
    schedule: schedule.default,
    auth: auth.youtube,
    begin: retention.begin,
    retain: retention.retain
  },
  {
    title: "wash/youtube/channel",
    schedule: schedule.default,
    auth: auth.youtube,
    begin: retention.begin,
    retain: retention.retain,
    channel: "foo",
    media: "audio"
  },
  {
    title: "wash/youtube/playlist",
    schedule: schedule.default,
    auth: auth.youtube,
    begin: retention.begin,
    retain: retention.retain,
    playlist: "foo",
    media: "video"
  },
  {
    title: "wash/vimeo/timeline",
    schedule: schedule.default,
    auth: auth.vimeo,
    begin: retention.begin,
    retain: retention.retain
  },
  {
    title: "wash/vimeo/channel",
    schedule: schedule.default,
    channel: "foo",
    auth: auth.vimeo,
    begin: retention.begin,
    retain: retention.retain
  },
  {
    title: "wash/vimeo/group",
    schedule: schedule.default,
    group: "foo",
    auth: auth.vimeo,
    begin: retention.begin,
    retain: retention.retain
  },
  {
    title: "wash/vimeo/user",
    schedule: schedule.default,
    user: "foo",
    auth: auth.vimeo,
    begin: retention.begin,
    retain: retention.retain
  },
  {
    title: "wash/feedbin/likes",
    schedule: schedule.default,
    auth: auth.feedbin
  },
  {
    title: "dry/feedbin/unlike",
    subscribe: ["wash/feedbin/likes"],
    auth: auth.feedbin
  },
  {
    title: "wash/podcast/likes",
    schedule: schedule.default,
    auth: auth.podcast
  },
  {
    title: "dry/podcast/unlike",
    subscribe: ["wash/podcast/likes"],
    auth: auth.podcast
  },
  {
    title: "dry/instagram/like",
    subscribe: ["wash/feedbin/likes"],
    auth: auth.instagram
  },
  id: "dry/youtube/like/feedbin",title: "dry/youtube/like",
  {
    subscribe: ["wash/feedbin/likes"],
    auth: auth.youtube
  },
  {
    title: "dry/vimeo/like",
    subscribe: ["wash/feedbin/likes"],
    auth: auth.vimeo
  },
  {
    title: "dry/twitter/like",
    subscribe: ["wash/feedbin/likes"],
    auth: auth.twitter
  },
  id: "dry/youtube/like/podcast",title: "dry/youtube/like",
  {
    subscribe: ["wash/podcast/likes"],
    auth: auth.youtube
  },
  {
    title: "dry/soundcloud/like",
    subscribe: ["wash/podcast/likes"],
    auth: auth.soundcloud
  },
  {
    title: "dry/mixcloud/like",
    subscribe: ["wash/podcast/likes"],
    auth: auth.soundcloud
  },
  {
    title: "dry/instagram/story",
    subscribe: ["wash/instagram/likes"],
    auth: auth.instagram
  },
  {
    title: "dry/twitter/tweet",
    subscribe: ["wash/instagram/user"],
    auth: auth.twitter
  },
  {
    title: "dry/email",
    subscribe: ["log/error"],
    to: "foo",
    auth: auth.email
  }
  */
];

washers.forEach(w => (w.id = w.id || w.title));

export = washers;
