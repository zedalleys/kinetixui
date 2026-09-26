/**
 * A minimal reader for the gzipped tarballs npm packs.
 *
 * Shelling out to `tar` would work on every machine this runs on, but reading the archive in
 * process keeps the artifact checks free of a platform-dependent subprocess and lets the packed
 * `package.json` be parsed directly rather than extracted to disk first.
 *
 * Only what npm tarballs actually contain is supported: regular files under `package/`, plus the
 * PAX and GNU long-name records npm emits when a path exceeds the 100-byte header field (which
 * @kinetixui/ui does, several times over).
 */
import { gunzipSync } from "node:zlib";

const BLOCK = 512;

const readString = (buffer, offset, length) => {
  const end = buffer.indexOf(0, offset);
  const stop = end === -1 || end > offset + length ? offset + length : end;
  return buffer.toString("utf8", offset, stop);
};

/** Tar stores sizes as octal; GNU uses a base-256 form for large files, which npm can emit. */
const readSize = (buffer, offset) => {
  if (buffer[offset] & 0x80) {
    let value = 0;
    for (let i = offset + 1; i < offset + 12; i++) value = value * 256 + buffer[i];
    return value;
  }
  const text = readString(buffer, offset, 12).trim();
  return text.length === 0 ? 0 : parseInt(text, 8) || 0;
};

/** `path=...` out of a PAX extended header record stream. */
const paxPath = (text) => {
  for (const line of text.split("\n")) {
    const space = line.indexOf(" ");
    if (space === -1) continue;
    const field = line.slice(space + 1);
    if (field.startsWith("path=")) return field.slice(5).replace(/\0+$/, "");
  }
  return null;
};

/**
 * @param {Buffer} tarball gzipped tar
 * @returns {{path: string, size: number, data: Buffer}[]} regular files, in archive order
 */
export function readTarball(tarball) {
  const tar = gunzipSync(tarball);
  const entries = [];
  let offset = 0;
  let overridePath = null;

  while (offset + BLOCK <= tar.length) {
    const header = tar.subarray(offset, offset + BLOCK);
    if (header.every((byte) => byte === 0)) break; // end-of-archive
    const name = readString(header, 0, 100);
    const size = readSize(header, 124);
    const type = String.fromCharCode(header[156] || 0x30);
    const prefix = readString(header, 345, 155);
    const body = tar.subarray(offset + BLOCK, offset + BLOCK + size);
    offset += BLOCK + Math.ceil(size / BLOCK) * BLOCK;

    if (type === "x" || type === "X") {
      overridePath = paxPath(body.toString("utf8"));
      continue;
    }
    if (type === "L") {
      overridePath = body.toString("utf8").replace(/\0+$/, "");
      continue;
    }
    if (type === "g") continue; // global PAX header, not per-entry

    const full = overridePath ?? (prefix ? `${prefix}/${name}` : name);
    overridePath = null;
    if (type !== "0" && type !== "\0" && type !== "7") continue; // directories, links, devices
    entries.push({ path: full, size, data: body });
  }
  return entries;
}

/**
 * Strip the leading `package/` npm wraps every tarball in.
 *
 * @param {{path: string, size: number, data: Buffer}[]} entries
 * @returns {{paths: string[], manifest: object|null, manifestError: string|null}}
 */
export function describePackage(entries) {
  const paths = [];
  let manifest = null;
  let manifestError = null;
  for (const entry of entries) {
    if (!entry.path.startsWith("package/")) continue;
    const relative = entry.path.slice("package/".length);
    if (relative.length === 0) continue;
    paths.push(relative);
    if (relative === "package.json") {
      try {
        manifest = JSON.parse(entry.data.toString("utf8"));
      } catch (error) {
        manifestError = `packed package.json is not valid JSON: ${error.message}`;
      }
    }
  }
  if (!manifest && !manifestError) manifestError = "tarball contains no package/package.json";
  return { paths: paths.sort(), manifest, manifestError };
}
