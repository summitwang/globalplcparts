"use strict";
/* eslint-disable @typescript-eslint/no-require-imports -- Shared with the standalone CommonJS crawler. */
const fs = require("node:fs"), path = require("node:path"), crypto = require("node:crypto");
const { FALLBACK, isLocalImagePath } = require("../lib/product-image-policy");
function inspectImage(value, root) {
  if (typeof value !== "string" || !value) return { kind: "empty" };
  if (/^(?:https?:)?\/\//i.test(value)) return { kind: "remote" };
  if (!isLocalImagePath(value)) return { kind: "invalid" };
  const publicRoot = path.resolve(root, "public"), file = path.resolve(publicRoot, value.slice(1));
  if (!file.startsWith(publicRoot + path.sep)) return { kind: "invalid" };
  try {
    let ancestor = publicRoot;
    for (const part of value.slice(1).split("/")) {
      ancestor = path.join(ancestor, part);
      if (fs.lstatSync(ancestor).isSymbolicLink()) return { kind: "invalid" };
    }
    const stat = fs.statSync(file);
    if (!stat.isFile() || stat.size === 0 || stat.size > 25000000) return { kind: "invalidFile" };
    const fd = fs.openSync(file, "r"), header = Buffer.alloc(Math.min(stat.size, 1024));
    try { fs.readSync(fd, header, 0, header.length, 0); } finally { fs.closeSync(fd); }
    const ext = path.extname(file).toLowerCase();
    const valid = /\.jpe?g/.test(ext) ? header[0] === 255 && header[1] === 216 && header[2] === 255 :
      ext === ".png" ? header.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) :
      ext === ".webp" ? header.toString("ascii", 0, 4) === "RIFF" && header.toString("ascii", 8, 12) === "WEBP" :
      ext === ".gif" ? /^GIF8[79]a/.test(header.toString("ascii")) :
      ext === ".avif" ? header.toString("ascii", 4, 8) === "ftyp" && /avif|avis/.test(header.toString("ascii", 8, 32)) :
      ext === ".svg" && /<svg[\s>]/i.test(header.toString("utf8"));
    return { kind: valid ? "valid" : "invalidFile" };
  } catch (e) { return { kind: e.code === "ENOENT" ? "missing" : "invalid" }; }
}
const localImage = (value, root) => inspectImage(value, root).kind === "valid" ? value : FALLBACK;
const hash = p => crypto.createHash("sha256").update(JSON.stringify(p)).digest("hex");
function preservationCheck(root) {
  const file = path.join(root, "data/product-image-repairs.json");
  const entries = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : { schema: 1, entries: [] };
  if (entries.schema !== 1 || !Array.isArray(entries.entries) || entries.entries.some(e => !/^[a-f0-9]{64}$/.test(e.before) || !/^[a-f0-9]{64}$/.test(e.after)))
    throw Object.assign(new Error("IMAGE_REPAIR_LEDGER_INVALID"), { code: "IMAGE_REPAIR_LEDGER_INVALID" });
  const approved = new Set(entries.entries.map(e => `${e.before}:${e.after}`));
  return (current, original) => {
    if (JSON.stringify(current) === JSON.stringify(original)) return true;
    if (!current || current.image !== FALLBACK) return false;
    const oldIdentity = { ...original }, newIdentity = { ...current };
    delete oldIdentity.image; delete newIdentity.image;
    return JSON.stringify(oldIdentity) === JSON.stringify(newIdentity) && approved.has(`${hash(original)}:${hash(current)}`);
  };
}
module.exports = { inspectImage, localImage, preservationCheck, hash, FALLBACK };
