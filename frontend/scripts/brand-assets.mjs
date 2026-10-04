/**
 * Regenerates the favicon, app icons and social-share card from the TUFF mark
 * (the volt disc and check from public/logo/logo_2.png, redrawn as vector so
 * it stays sharp at every size). The share card uses logo_2.png as it is.
 *
 *   node scripts/brand-assets.mjs
 *
 * Writes app/icon.png, app/apple-icon.png, app/favicon.ico,
 * app/opengraph-image.png, app/twitter-image.png and public/icons/*.png.
 * They're committed, so this only needs running when the brand changes.
 */
import { chromium } from "@playwright/test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const file = (...p) => resolve(root, ...p);
const url = (...p) => pathToFileURL(file(...p)).href;

const CANVAS = "#0b0b0d";
const VOLT = "#e6f928"; // the logo's disc, sampled from logo_2.png
const INK = "#2f2f31"; // …and its check
const CHECK = "M113.04 207.13L205 118.36L235 135.64L114.61 251.83L57.7 197L80.27 175.56Z";

/** The disc with the check on top, in logo_2.png's own coordinates (the
 *  check's tip pokes a little past the disc, as it does in the logo). */
const mark = (size, { background = "none", scale = 1 } = {}) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${background}"/>
  <svg x="${(size * (1 - scale)) / 2}" y="${(size * (1 - scale)) / 2}" width="${size * scale}" height="${size * scale}" viewBox="18.25 91.8 222 222">
    <ellipse cx="118.95" cy="202.8" rx="95.41" ry="91.24" fill="${VOLT}"/>
    <path d="${CHECK}" fill="${INK}"/>
  </svg>
</svg>`;

const ogCard = `
<style>
  @font-face { font-family: Satoshi; src: url("${url("public/fonts/Satoshi-Variable.woff2")}"); font-weight: 300 900; }
  html, body { margin: 0; }
  body { position: relative; width: 1200px; height: 630px; overflow: hidden; background: ${CANVAS}; font-family: Satoshi, system-ui, sans-serif; }
  .glow { position: absolute; border-radius: 50%; }
  .volt { right: -240px; top: -300px; width: 940px; height: 760px; background: radial-gradient(closest-side, rgba(215,255,61,.17), transparent); }
  .surge { left: -300px; bottom: -360px; width: 940px; height: 760px; background: radial-gradient(closest-side, rgba(250,87,5,.15), transparent); }
  /* logo_2.png has transparent padding; show just the mark and wordmark. */
  .logo { position: absolute; left: 84px; top: 112px; width: 640px; height: 122px;
          background: url("${url("public/logo/logo_2.png")}") -5.8px -55px / 656px 217px no-repeat; }
  .bar { position: absolute; left: 84px; top: 296px; width: 132px; height: 8px; border-radius: 8px; background: linear-gradient(90deg, #d7ff3d, #fa5705); }
  h1 { position: absolute; left: 84px; top: 340px; margin: 0; width: 1040px; color: #fff; font-weight: 800; font-size: 66px; line-height: 1.1; letter-spacing: -0.02em; }
</style>
<div class="glow volt"></div><div class="glow surge"></div>
<div class="logo"></div><div class="bar"></div>
<h1>Team fitness challenges,<br>streaks, and leaderboards.</h1>`;

const browser = await chromium.launch({ channel: "chromium" });
const context = await browser.newContext({ deviceScaleFactor: 1 });
const page = await context.newPage();

// Pages are loaded from a real file: an about:blank page may not load the
// file:// font and logo the share card uses.
const scratch = await mkdtemp(join(tmpdir(), "tuff-brand-"));

async function render(html, width, height, { transparent = false } = {}) {
  const doc = join(scratch, "page.html");
  await writeFile(doc, `<!doctype html><meta charset="utf-8"><body style="margin:0;background:${transparent ? "transparent" : "#000"}">${html}`);
  await page.setViewportSize({ width, height });
  await page.goto(pathToFileURL(doc).href);
  await page.evaluate(() => document.fonts.ready);
  return page.screenshot({ omitBackground: transparent, clip: { x: 0, y: 0, width, height } });
}

const save = async (path, buf) => {
  await mkdir(dirname(file(path)), { recursive: true });
  await writeFile(file(path), buf);
  console.log(`${path.padEnd(32)} ${(buf.length / 1024).toFixed(1)} kB`);
};

// Browser tab and install icons: the mark on transparent.
const icon = (size) => render(mark(size), size, size, { transparent: true });
await save("app/icon.png", await icon(512));
await save("public/icons/icon-192.png", await icon(192));
await save("public/icons/icon-512.png", await icon(512));
// Maskable: full-bleed canvas, mark kept inside the central safe zone.
await save("public/icons/icon-maskable-512.png", await render(mark(512, { background: CANVAS, scale: 0.62 }), 512, 512));
// iOS home screen: opaque (iOS fills transparency with black and rounds the corners itself).
await save("app/apple-icon.png", await render(mark(180, { background: CANVAS, scale: 0.7 }), 180, 180));

// favicon.ico: PNG-compressed frames, which every current browser reads.
const frames = [];
for (const size of [16, 32, 48]) frames.push({ size, png: await icon(size) });
const header = Buffer.alloc(6 + 16 * frames.length);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(frames.length, 4);
let offset = header.length;
frames.forEach(({ size, png }, i) => {
  const at = 6 + 16 * i;
  header.writeUInt8(size, at);
  header.writeUInt8(size, at + 1);
  header.writeUInt16LE(1, at + 4); // colour planes
  header.writeUInt16LE(32, at + 6); // bits per pixel
  header.writeUInt32LE(png.length, at + 8);
  header.writeUInt32LE(offset, at + 12);
  offset += png.length;
});
await save("app/favicon.ico", Buffer.concat([header, ...frames.map((f) => f.png)]));

// Social card, 1200x630.
const og = await render(ogCard, 1200, 630);
await save("app/opengraph-image.png", og);
await save("app/twitter-image.png", og);

await browser.close();
await rm(scratch, { recursive: true, force: true });
