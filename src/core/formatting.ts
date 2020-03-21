import Autolinker from "autolinker";
import HB from "handlebars";

export const InstagramLinker = new Autolinker({
  urls: true,
  email: true,
  phone: true,
  hashtag: "instagram",
  mention: "instagram",
  newWindow: false,
  stripPrefix: true,
  stripTrailingSlash: true,
  truncate: undefined
});

HB.registerHelper("toLocaleString", (context: any) => {
  return context ? context.toLocaleString(process.env.LAUNDRY_LOCALE) : "";
});

HB.registerHelper("instagramLinker", (context: any) => {
  return context ? InstagramLinker.link(context.toString()) : "";
});

export const Handlebars = HB;
