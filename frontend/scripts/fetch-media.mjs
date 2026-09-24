#!/usr/bin/env node
/**
 * Self-host the auth-panel clips.
 *
 * Downloads each clip listed in data/auth-media.json (from its `remote.src`)
 * into public/media/. If ffmpeg + ffprobe are on your PATH it also:
 *   - turns the 8s clip into a seamless loop (the last second crossfades into
 *     the first, so the <video loop> restart has no visible jump),
 *   - re-encodes it web-ready (H.264, CRF 24, 1080px wide, faststart, no audio),
 *   - grabs the first frame as a JPEG poster.
 * Without ffmpeg it keeps the original file and saves Artlist's thumbnail as
 * the poster. Finally it points `src` / `poster` in data/auth-media.json at
 * the local copies, so the next build serves them from your own domain.
 *
 * Usage: npm run media:fetch
 */
import { readFile, writeFile, mkdir, rm, rename } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = path.join(root, "data", "auth-media.json");
const outDir = path.join(root, "public", "media");
const FADE_SECONDS = 1;

const available = (cmd) => spawnSync(cmd, ["-version"], { stdio: "ignore" }).status === 0;

function run(cmd, args) {
  const result = spawnSync(cmd, args, { stdio: ["ignore", "ignore", "pipe"] });
  if (result.status !== 0) {
    throw new Error(`${cmd} failed:\n${result.stderr?.toString().slice(-2000)}`);
  }
}

function durationOf(file) {
  const result = spawnSync("ffprobe", [
    "-v", "error",
    "-show_entries", "format=duration",
    "-of", "default=noprint_wrappers=1:nokey=1",
    file,
  ]);
  const seconds = parseFloat(result.stdout.toString());
  if (!Number.isFinite(seconds)) throw new Error(`Could not read the duration of ${file}`);
  return seconds;
}

async function download(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed (${res.status}) for ${url.split("?")[0]}`);
  await writeFile(dest, Buffer.from(await res.arrayBuffer()));
}

/** Seamless loop: body = clip minus its first FADE seconds; its tail crossfades into those opening seconds. */
export function loopFilter(durationSeconds, fade = FADE_SECONDS) {
  const offset = (durationSeconds - fade - fade).toFixed(3);
  return (
    `[0:v]split[a][b];` +
    `[a]trim=start=${fade},setpts=PTS-STARTPTS[body];` +
    `[b]trim=end=${fade},setpts=PTS-STARTPTS[head];` +
    `[body][head]xfade=transition=fade:duration=${fade}:offset=${offset},` +
    `scale=1080:-2:flags=lanczos,format=yuv420p[v]`
  );
}

export function encodeLoop(input, output) {
  run("ffmpeg", [
    "-y", "-i", input,
    "-filter_complex", loopFilter(durationOf(input)),
    "-map", "[v]", "-an",
    "-c:v", "libx264", "-preset", "slow", "-crf", "24",
    "-movflags", "+faststart",
    output,
  ]);
}

export function extractPoster(video, poster) {
  run("ffmpeg", ["-y", "-i", video, "-frames:v", "1", "-q:v", "3", poster]);
}

async function main() {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  await mkdir(outDir, { recursive: true });

  const ffmpeg = available("ffmpeg") && available("ffprobe");
  if (!ffmpeg) {
    console.warn(
      "ffmpeg not found — saving the original clips as-is. Install ffmpeg for seamless loops and smaller files.",
    );
  }

  for (const [key, clip] of Object.entries(manifest.clips)) {
    const base = `auth-${key}`;
    const raw = path.join(outDir, `${base}.raw.mp4`);
    const video = path.join(outDir, `${base}.mp4`);
    const poster = path.join(outDir, `${base}.jpg`);

    console.log(`Downloading ${key} clip…`);
    await download(clip.remote.src, raw);

    if (ffmpeg) {
      encodeLoop(raw, video);
      extractPoster(video, poster);
      await rm(raw);
    } else {
      await rename(raw, video);
      await download(clip.remote.poster, poster);
    }

    clip.src = `/media/${base}.mp4`;
    clip.poster = `/media/${base}.jpg`;
  }

  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log("Done — clips are in public/media and data/auth-media.json now points at them.");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
