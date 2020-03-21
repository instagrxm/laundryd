import Autolinker from "autolinker";
import HB from "handlebars";

// Convert a number to a string, including commas and decimals according to the current locale.
HB.registerHelper("toLocaleString", (context: any) => {
  if (!context) {
    return "";
  }

  return context.toLocaleString(process.env.LAUNDRY_LOCALE);
});

// Add HTML links to Instagram text.
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

HB.registerHelper("instagramLinker", (context: any) => {
  if (!context) {
    return "";
  }

  return InstagramLinker.link(context.toString());
});

// Add HTML links to general plain text.
export const BasicLinker = new Autolinker({
  urls: true,
  email: true,
  phone: true,
  newWindow: false,
  stripPrefix: true,
  stripTrailingSlash: true,
  truncate: undefined
});

HB.registerHelper("basicLinker", (context: any) => {
  if (!context) {
    return "";
  }

  return BasicLinker.link(context.toString());
});

// Convert plain text formatted with newlines to use <br/> and <p> tags.
HB.registerHelper("breaksToHtml", (context: any) => {
  if (!context) {
    return "";
  }

  return (
    "<p>" +
    context
      .toString()
      .replace(/\n{2,}/g, "</p><p>")
      .replace(/\n/g, "<br>") +
    "</p>"
  );
});

export const Handlebars = HB;
