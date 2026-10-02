#!/usr/bin/env node
/**
 * Self-host Satoshi (#22).
 *
 * Satoshi's ITF Free Font License allows self-hosting on our own site, but
 * not redistributing the font files through a public repository — so the
 * .woff2 is gitignored and fetched here instead, before `dev` and `build`
 * (see package.json). The deployed site still serves it from its own domain;
 * nothing loads from Fontshare at runtime.
 *
 * Never fails the build: if the download doesn't work, the app falls back
 * to the system font (globals.css) and this prints a warning.
 *
 * Usage: npm run fonts:fetch (runs automatically before dev and build)
 */
import { access, mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dest = path.join(root, "public", "fonts", "Satoshi-Variable.woff2");
// The variable font (weights 300–900) from Fontshare's CSS API.
const CSS_URL = "https://api.fontshare.com/v2/css?f[]=satoshi@1&display=swap";

try {
  await access(dest);
  process.exit(0); // already here
} catch {
  // not yet — fetch it below
}

try {
  const css = await (await fetch(CSS_URL)).text();
  const match = css.match(/url\('([^']+\.woff2)'\)/);
  if (!match) throw new Error("no woff2 URL in Fontshare's CSS");
  const url = match[1].startsWith("//") ? `https:${match[1]}` : match[1];
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download failed (${res.status})`);
  await mkdir(path.dirname(dest), { recursive: true });
  await writeFile(dest, Buffer.from(await res.arrayBuffer()));
  console.log("Satoshi saved to public/fonts/.");
} catch (err) {
  console.warn(`Couldn't fetch Satoshi (${err.message}). Body text falls back to the system font.`);
}
