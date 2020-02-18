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
  default: {
    start: 90,
    retain: 0
  }
};

const sync = {
  default: 90
};

const schedule = {
  default: "* * * * *"
};

export const database = {
  connection: "couchdb://"
};

export const triggers = [
  {
    schedule: schedule.default,
    wash: [
      {
        name: "wash/mixcloud/uploads",
        auth: auth.mixcloud,
        retention: retention.default
      },
      {
        name: "wash/mixcloud/user",
        retention: retention.default,
        user: "redbullradio"
      }
    ]
  },
  {
    schedule: schedule.default,
    wash: [
      {
        name: "wash/instagram/timeline",
        auth: auth.instagram,
        retention: retention.default
      },
      {
        name: "wash/instagram/user",
        auth: auth.instagram,
        retention: retention.default,
        user: "foo"
      },
      {
        name: "wash/instagram/hashtag",
        auth: auth.instagram,
        retention: retention.default,
        hashtag: "foo"
      },
      {
        name: "wash/instagram/likes",
        auth: auth.instagram,
        sync: sync.default
      }
    ]
  },
  {
    schedule: schedule.default,
    wash: [
      {
        name: "wash/twitter/timeline",
        auth: auth.twitter,
        retention: retention.default
      },
      {
        name: "wash/twitter/user",
        auth: auth.twitter,
        retention: retention.default,
        user: "foo"
      },
      {
        name: "wash/twitter/list",
        auth: auth.twitter,
        retention: retention.default,
        list: "foo"
      },
      {
        name: "wash/twitter/hashtag",
        auth: auth.twitter,
        retention: retention.default,
        hashtag: "foo"
      },
      {
        name: "wash/twitter/likes",
        auth: auth.twitter,
        sync: sync.default
      }
    ]
  },
  {
    schedule: schedule.default,
    wash: [
      {
        name: "wash/soundcloud/user",
        user: "foo",
        auth: auth.soundcloud,
        retention: retention.default,
        media: "audio"
      },
      {
        name: "wash/soundcloud/playlist",
        playlist: "foo",
        auth: auth.soundcloud,
        retention: retention.default,
        media: "audio"
      },
      {
        name: "wash/soundcloud/timeline",
        auth: auth.soundcloud,
        retention: retention.default,
        media: "audio"
      }
    ]
  },
  {
    schedule: schedule.default,
    wash: [
      {
        name: "wash/youtube/subscriptions",
        auth: auth.youtube,
        retention: retention.default
      },
      {
        name: "wash/youtube/channel",
        auth: auth.youtube,
        retention: retention.default,
        channel: "foo",
        media: "audio"
      },
      {
        name: "wash/youtube/playlist",
        auth: auth.youtube,
        retention: retention.default,
        playlist: "foo",
        media: "video"
      }
    ]
  },
  {
    schedule: schedule.default,
    wash: [
      {
        name: "wash/vimeo/timeline",
        auth: auth.vimeo,
        retention: retention.default
      },
      {
        name: "wash/vimeo/channel",
        channel: "foo",
        auth: auth.vimeo,
        retention: retention.default
      },
      {
        name: "wash/vimeo/group",
        group: "foo",
        auth: auth.vimeo,
        retention: retention.default
      },
      {
        name: "wash/vimeo/user",
        user: "foo",
        auth: auth.vimeo,
        retention: retention.default
      }
    ]
  },
  {
    schedule: schedule.default,
    wash: [
      {
        name: "wash/feedbin/likes",
        auth: auth.feedbin,
        sync: sync.default
      }
    ]
  },
  {
    schedule: schedule.default,
    wash: [
      {
        name: "wash/podcast/likes",
        auth: auth.podcast,
        sync: sync.default
      }
    ]
  },
  {
    subscription: "on new feedbin like matching instagram",
    dry: [
      {
        name: "dry/instagram/like",
        auth: auth.instagram
      },
      {
        name: "dry/feedbin/unlike",
        auth: auth.feedbin
      }
    ]
  },
  {
    subscription: "on new feedbin like matching youtube",
    dry: [
      {
        name: "dry/youtube/like",
        auth: auth.youtube
      },
      {
        name: "dry/feedbin/unlike",
        auth: auth.feedbin
      }
    ]
  },
  {
    subscription: "on new feedbin like matching vimeo",
    dry: [
      {
        name: "dry/vimeo/like",
        auth: auth.vimeo
      },
      {
        name: "dry/feedbin/unlike",
        auth: auth.feedbin
      }
    ]
  },
  {
    subscription: "on new feedbin like matching twitter",
    dry: [
      {
        name: "dry/twitter/like",
        auth: auth.twitter
      },
      {
        name: "dry/feedbin/unlike",
        auth: auth.feedbin
      }
    ]
  },
  {
    subscription: "on new podcast like matching youtube",
    dry: [
      {
        name: "dry/youtube/like",
        auth: auth.youtube
      },
      {
        name: "dry/podcast/unlike",
        auth: auth.podcast
      }
    ]
  },
  {
    subscription: "on new podcast like matching soundcloud",
    dry: [
      {
        name: "dry/soundcloud/like",
        auth: auth.soundcloud
      },
      {
        name: "dry/podcast/unlike",
        auth: auth.podcast
      }
    ]
  },
  {
    subscription: "on new instagram like matching instagram",
    dry: [
      {
        name: "dry/instagram/story",
        auth: auth.instagram
      }
    ]
  },
  {
    subscription: "on new instagram post matching endquote",
    dry: [
      {
        name: "dry/twitter/tweet",
        auth: auth.twitter
      }
    ]
  },
  {
    subscription: "on new log error",
    dry: [
      {
        name: "dry/email",
        to: "foo",
        auth: auth.email
      }
    ]
  }
];
