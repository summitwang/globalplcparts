"use strict";
const FALLBACK = "/product-images/default.jpg";
function isLocalImagePath(value) {
  return typeof value === "string" && /^\/product-images\/[a-z0-9 _./()+-]+\.(?:jpg|jpeg|png|webp|gif|svg|avif)$/i.test(value) &&
    !value.slice(1).split("/").some(part => part === "." || part === ".." || part === "");
}
// First segment is empty for an absolute public path; reject only later empty segments.
function applicationImage(value) {
  return isLocalImagePath(value) ? value : FALLBACK;
}
module.exports = { FALLBACK, isLocalImagePath, applicationImage };
