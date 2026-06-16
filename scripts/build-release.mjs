#!/usr/bin/env node
// Cross-platform release packager for YouTube Focus Mode.
// Zero dependencies: builds a valid ZIP (forward-slash entries, as Chrome
// requires) using only Node's built-in zlib. Replaces build-release.ps1,
// which used PowerShell Compress-Archive and produced backslash entry names
// that can break icon/path resolution on the Chrome Web Store.
//
// Usage: node scripts/build-release.mjs [version]

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { deflateRawSync } from 'node:zlib';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(join(ROOT, 'manifest.json'), 'utf8'));
const version = process.argv[2] || manifest.version;

// Exactly the files Chrome needs — no docs, tests, or dev artifacts.
const FILES = [
  'manifest.json',
  'popup.html',
  'popup.js',
  'storage.js',
  'content.js',
  'styles.css',
  'icons/icon16.png',
  'icons/icon48.png',
  'icons/icon128.png',
];

const missing = FILES.filter((f) => !existsSync(join(ROOT, f)));
if (missing.length) {
  console.error('Missing release files: ' + missing.join(', '));
  process.exit(1);
}

// --- minimal ZIP writer (store + deflate), forward-slash names only ---
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function buildZip(entries) {
  const locals = [];
  const central = [];
  let offset = 0;
  for (const { name, data } of entries) {
    const nameBuf = Buffer.from(name.replace(/\\/g, '/'), 'utf8');
    const crc = crc32(data);
    const deflated = deflateRawSync(data, { level: 9 });
    const useStore = deflated.length >= data.length;
    const method = useStore ? 0 : 8;
    const body = useStore ? data : deflated;

    const lf = Buffer.alloc(30);
    lf.writeUInt32LE(0x04034b50, 0); // local file header sig
    lf.writeUInt16LE(20, 4); // version needed
    lf.writeUInt16LE(0, 6); // flags
    lf.writeUInt16LE(method, 8);
    lf.writeUInt16LE(0, 10); // mod time
    lf.writeUInt16LE(0x21, 12); // mod date (fixed 1980-01-01)
    lf.writeUInt32LE(crc, 14);
    lf.writeUInt32LE(body.length, 18);
    lf.writeUInt32LE(data.length, 22);
    lf.writeUInt16LE(nameBuf.length, 26);
    lf.writeUInt16LE(0, 28);
    locals.push(lf, nameBuf, body);

    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0); // central dir sig
    cd.writeUInt16LE(20, 4); // version made by
    cd.writeUInt16LE(20, 6); // version needed
    cd.writeUInt16LE(0, 8);
    cd.writeUInt16LE(method, 10);
    cd.writeUInt16LE(0, 12);
    cd.writeUInt16LE(0x21, 14);
    cd.writeUInt32LE(crc, 16);
    cd.writeUInt32LE(body.length, 20);
    cd.writeUInt32LE(data.length, 24);
    cd.writeUInt16LE(nameBuf.length, 28);
    cd.writeUInt16LE(0, 30);
    cd.writeUInt16LE(0, 32);
    cd.writeUInt16LE(0, 34);
    cd.writeUInt16LE(0, 36);
    cd.writeUInt32LE(0, 38); // external attrs
    cd.writeUInt32LE(offset, 42);
    central.push(cd, nameBuf);

    offset += lf.length + nameBuf.length + body.length;
  }
  const centralBuf = Buffer.concat(central);
  const localBuf = Buffer.concat(locals);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralBuf.length, 12);
  eocd.writeUInt32LE(localBuf.length, 16);
  eocd.writeUInt16LE(0, 20);
  return Buffer.concat([localBuf, centralBuf, eocd]);
}

const entries = FILES.map((name) => ({ name, data: readFileSync(join(ROOT, name)) }));
const zip = buildZip(entries);

const releaseDir = join(ROOT, 'release');
mkdirSync(releaseDir, { recursive: true });
const out = join(releaseDir, `youtube-focus-mode-v${version}.zip`);
writeFileSync(out, zip);

const sha = createHash('sha256').update(zip).digest('hex');
console.log(`Built ${out} (${zip.length} bytes, ${entries.length} files)`);
console.log(`SHA256 ${sha}`);
