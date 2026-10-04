#!/usr/bin/env node
/**
 * Self-host the exercise-library clips generated via Artlist (Kling v3 Pro,
 * 1080p, 5s, 16:9, no audio). Downloads each clip into public/media/exercises/
 * and, if ffmpeg + ffprobe are on PATH, re-encodes it as a seamless loop
 * (last second crossfades into the first) plus a poster frame — same
 * pipeline as scripts/fetch-media.mjs for the auth clips.
 *
 * Usage: node scripts/fetch-exercise-media.mjs
 *
 * Clips already downloaded are simply re-downloaded, so it is safe to re-run
 * after adding new slugs to CLIPS.
 */
import { readFile, writeFile, mkdir, rm, rename } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { encodeLoop, extractPoster } from "./fetch-media.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "public", "media", "exercises");
const exercisesPath = path.join(root, "data", "exercises.ts");

// slug -> Artlist generation fileUrl, in the order each clip was generated.
const CLIPS = {
  pushups: "https://cms-toolkit-artifacts.artlist.io/content/-t-e-x-t_-t-o_-v-i-d-e-o-v1/media__4/-t-e-x-t_-t-o_-v-i-d-e-o-27de0686-a738-4751-a107-ebf302887334.mp4?Expires=2106269001&Key-Pair-Id=K2ZDLYDZI2R1DF&Signature=xCMU9QTRpQ-zTdke7eo00~ZLkH~e~RKVync271T1VXuKKBqVb16e94s3KSNFxS-K5BilDPohn~r0MYIezD7R3jIILYCCpmd963gF822DiVHEiuSa-Ox3eyk9zm071Qq-fv~kFEyC7jD4umcNRY2xzWCUEwBqIxC2mhFO61juzlbPdfCeAdX9cMJkeD5TqEhlEVpLt4foNLaizYGPiPscBbjPF6b3S~RJ02-u~56IKbwdxVVxfF72No~kTRV2EfAOSpABgj~ZuTAyZdLi1rw~d1fVeb7pAy5Fm6CdRUVWM74RClj05w8WpcvztufH5yW1q9t2ztIDHym~7xYu1mHwmQ__",
  pullups: "https://cms-toolkit-artifacts.artlist.io/content/-t-e-x-t_-t-o_-v-i-d-e-o-v1/media__1/-t-e-x-t_-t-o_-v-i-d-e-o-14ea65c8-663c-4c8d-99de-4915c97bb691.mp4?Expires=2106269005&Key-Pair-Id=K2ZDLYDZI2R1DF&Signature=NP3R0Sx~IDBv~OKN~17EpOuTu9h4ZGomnNpAyxPNnjFa7ObHFK0x8rGIl20Y1wTowoiN28eNumJMLdAjmS0dg2NevdQDKccuGQxOoc2j4mjvKmw5Whp41fogAC0ryijl8XC4zlBeIX4M5zMtv5xGIm-aPWEXBdPZm2Faf7~R3dAZToGdCvVjBGhf9Y4nLWVAqqqYi7geR3ELIh74jK7EWfa0C33qRcV5OFIQedAWmTByc10ZYRpTwD0bFMFBnufdxmR5ErQgCDMBnfuirBKr6fmEeCjBSpwOR3ZFMtg8n64inAYintK4cwUdWbEn2l7frW3a4X-ZP8-EQUfZAKDWvw__",
  squats: "https://cms-toolkit-artifacts.artlist.io/content/-t-e-x-t_-t-o_-v-i-d-e-o-v1/media__2/-t-e-x-t_-t-o_-v-i-d-e-o-523e74a5-c89c-4cb5-8165-633ef92ecfc4.mp4?Expires=2106269005&Key-Pair-Id=K2ZDLYDZI2R1DF&Signature=Wz-jeCGUTsefSBxvn~IItW5kFKX2cZ-oX3w1qlVmFDnREuDCY4rALSaK7evNROHUn3UhXSpKAtzg-NPXN5w2k1FuDMLbHVaIvWKQUua9FpCQsRGlppfXOJkOldpS3X12E0eX4HGUWbQgT5n7NLsB2gdjTFYPIMt1luWBigOxGDh5v4-U~najNe4NAH3~Kk5fuHVTeWK3LWpRagKlDX0JaRWfRAv9lwvM7rXMS2-erxYvHZnOPWtTv7xo8vX7VCflO1hr6dd0Fy13uhPTaQ9BZ19EirUxOrapPZR1ppWU0qJHARHGmg~dk5HMV4CLQcJ1AwLiLEsiqhRTRLU5d17lPQ__",
  plank: "https://cms-toolkit-artifacts.artlist.io/content/-t-e-x-t_-t-o_-v-i-d-e-o-v1/media__6/-t-e-x-t_-t-o_-v-i-d-e-o-99b235d7-6a71-424e-8bfd-4b7998b2ea3e.mp4?Expires=2106269011&Key-Pair-Id=K2ZDLYDZI2R1DF&Signature=sZQHEMPiYvfSfspD6IkfJa9ejQtlINv0ZONMH5M4JbA8-U2uMvEOIdFaTgzafvIjNStkeuMEh2Nl6HE627n3lvfUsDQx9qPwaN3x11jXLtlTo5DcIBRII3CkCgHtlC5sVN7JKZkaEyBwxT9gVUzyeyHt7uy0pdQK~HOCFk1R~1qgoEQNV-Hig7Z86R7xJU56y9Flx~KMRal36WYaL6UVmUyKbCeMm42IAKXyBZrPEJCRt9SMrzmAmqUVbRWT4rk~SuN6znqoA90E~gNenP448~LaQOA~Vlnl-SvWEpovXwJIhASKrn1Y50OUCK~I8cWlT3rGxsdnevkEXPKFqS2joA__",
  "jumping-jacks": "https://cms-toolkit-artifacts.artlist.io/content/-t-e-x-t_-t-o_-v-i-d-e-o-v1/media__5/-t-e-x-t_-t-o_-v-i-d-e-o-9f47e5c5-19d4-42d4-95d0-15bac9843622.mp4?Expires=2106269009&Key-Pair-Id=K2ZDLYDZI2R1DF&Signature=kz8DsCTvhV6m8jE8q7OZvBcsQGqMQW61fVbRkZtSSPpPIhrn3abD1hCXW4E8NEn6clR7lrIUHSWG-O5nFXCq07hDzUe~4laYlfJATUXixh33FxM3CDON9W~txuQT7vO7UBrPUrwKsPnbdZBAnznGOQQwPLk7JK3FtCJuMje~BehkI8yYItPmZ2psZUJ-8renXaXOoi47PPVr30WvHAD0P8r7buJg4CRhQHWj-v9GU6CP3q8rqI0UpbXWJZ9IgNcF00rRqJpweH4ySWzxkb~BZa48kpphUNvICVgZC4lkMgGpwLh-Ebi4i7LsL8HWV6M1RQ5p1toN1DcsQ3fGWYnBPg__",
  burpees: "https://cms-toolkit-artifacts.artlist.io/content/-t-e-x-t_-t-o_-v-i-d-e-o-v1/media__9/-t-e-x-t_-t-o_-v-i-d-e-o-b2577d03-e95f-431a-a0f9-e5ef16579b8b.mp4?Expires=2106269003&Key-Pair-Id=K2ZDLYDZI2R1DF&Signature=thbM-AZ0Ttkm01N-hgIz2AHW~bsGgAd1cV-IxM0UeX9BIEAOb-F-jKLK4nFx0TmbkDEBbOd7Em7WxjUoYPJJH8aewgSasYr9Z~~n5pwy7FA1Z28rK1~g4sknUJbLemcdPuRs0bSzfC1kfBYWfbhx9ChuOvdXCL-yCLd5~4QqatSvKAjl7pF3U6jXtP~TR6ltWzqevtuoDpfUADQdHqrPBTp5fRgU8q0gk8O1LnbCSgAfYaJLzI8ir8NDdaEzexpUHuKeB6yi3L-vZTDdZdPYiFIPmVrkkSA9wwXFpZTUo39vZu75I-XUTudSzLozM7Zn6WPQhnT9~UGrgn2eBKt5~w__",
  lunges: "https://cms-toolkit-artifacts.artlist.io/content/-t-e-x-t_-t-o_-v-i-d-e-o-v1/media__10/-t-e-x-t_-t-o_-v-i-d-e-o-167c0c79-57ed-46b1-9343-bcd7679f8f38.mp4?Expires=2106269003&Key-Pair-Id=K2ZDLYDZI2R1DF&Signature=r~y3toeU8B-VpNVLB~-8JTR5TaYAjPt0NcJI~kW2V0qA9AA32h9Sz7I7cDSx0fRDDJYzReyHInFsdCVqExhqrkL0ps1Ea5qIeXsEBMrr4AASKt4P6yjfXZZ1PlJCnKn8TXz3lqMewP-UZIFCeUupOJmyjnSUq8O9idp8xrGQF9k9Nw~CFMeaEPy5VdXxOA5vwj~YbXBgKo6Hzq3pyegyzj-l8YzdX75Evu6zJS3HvULhq1GTHth2gwN76vvSQanWBtxAwU0yvTcHWsJBsBd1D6k4wcHy7ycQaQb1KVWK9dgZbOw~md75PP-SlKcd03mqvyBYoHifhQ5omJg89kR~lw__",
  "mountain-climbers": "https://cms-toolkit-artifacts.artlist.io/content/-t-e-x-t_-t-o_-v-i-d-e-o-v1/media__4/-t-e-x-t_-t-o_-v-i-d-e-o-454c26f4-5390-4606-8d60-89e548ebf7fe.mp4?Expires=2106269007&Key-Pair-Id=K2ZDLYDZI2R1DF&Signature=Tl9yD6XffbZ6CPwN2T-4VblqImaMh-Mhu5EtZgQlOgeiWBVs4Ku132ppiGQ2A0NhXTBQ2ZFodts3jjf8WHTk58Vi2HXtnVwGY~P9~KjdsiIsioZticvQDX5zF33iA5VnbV5SQVtaS3Js6Qqmtw-yqKgRPchi4JL7O7BFGT2vaAg57EZK~h-n-mqT08B1xaJRM9gVyk14CzJCEcOvnhuQpiP0XXaNp4CZkwwaXfnCzp2sX-XRy~I9XGLhuX0LSLCiFuWyLKhcLrViJTWtVsCUIAHgWBoWQyLTiJwvJmF99N12Z7XinD~qflOu0CtGUgnkNdA2Eu8ElAVqirdU4N5X7g__",
  "glute-bridges": "https://cms-toolkit-artifacts.artlist.io/content/-t-e-x-t_-t-o_-v-i-d-e-o-v1/media__2/-t-e-x-t_-t-o_-v-i-d-e-o-0471a62b-ea3a-4140-b533-a56a613d65ce.mp4?Expires=2106269007&Key-Pair-Id=K2ZDLYDZI2R1DF&Signature=oXFJ8BP79Ex-c8iXGOCeSk9NABqEHXfAYHOGociBcrgfj10a3Cz0MX36MU5vKACd2Sv7Iu~HatjJ1viD3hc3dXVIv9f3ep~5i5fXFf7OZGfu3t-V0-bOmLdVD7g3cnpN23GCOWN~7TNVCSdD-WNOiOjZ1I4uZa1q67LWfmqRSq~wwYoUADQUlqM1ogqB-vQdS3H6Iymz5W1iHtC1gEYC3gQFd9F4xq4QxpoKrb20TGhl3hPhtq4vy1umLkyn18ue3fpikyf9GH5sxGH8KCTQamKRg4VnKwCiqSYE3805~StPUrxkrSjejIamnHed8vUF4ksUvd1pSObIjC4-kIfC8A__",
};


// The Pilates clips are not generated yet. Generate each one on Artlist with
// the same settings as the rest (Kling v3 Pro, 1080p, 5 seconds, 16:9, no
// audio), then paste its fileUrl into CLIPS above under the same slug and run
// this script: it downloads, loops, cuts a poster and points data/exercises.ts
// at the result. Nothing else needs changing, and an exercise with no clip
// already falls back to its category icon.
export const PILATES_PROMPTS = {
  hundred:
    "Fit woman on a mat in a bright minimal studio, lying on her back, knees in tabletop, head and shoulders curled up, arms long by her hips pumping in small fast beats, side view, soft daylight, no text",
  "roll-up":
    "Fit woman on a mat in a bright minimal studio, slowly rolling up one vertebra at a time from lying flat to sitting tall with arms reaching forward, legs straight, side view, soft daylight, no text",
  "single-leg-circles":
    "Fit woman lying on her back on a mat in a bright minimal studio, one leg pointed to the ceiling drawing a slow circle, the other leg long on the mat, hips still, high side view, soft daylight, no text",
  "rolling-like-a-ball":
    "Fit woman on a mat in a bright minimal studio, tucked into a tight ball holding her shins, balancing behind her tailbone and rolling smoothly back and up, side view, soft daylight, no text",
  "single-leg-stretch":
    "Fit woman on a mat in a bright minimal studio, head and shoulders curled up, pulling one knee to her chest while the other leg extends low, alternating smoothly, high side view, soft daylight, no text",
  "double-leg-stretch":
    "Fit woman on a mat in a bright minimal studio, curled up with knees to chest then reaching both arms overhead and both legs long, circling the arms back to the knees, side view, soft daylight, no text",
  "criss-cross":
    "Fit woman on a mat in a bright minimal studio, hands behind her head with elbows wide, rotating her chest towards the opposite bent knee while the other leg extends, slow and controlled, high angle, soft daylight, no text",
  "spine-stretch-forward":
    "Fit woman sitting tall on a mat in a bright minimal studio, legs straight and wide with flexed feet, arms reaching forward as she curls down over an imaginary ball and stacks back up, side view, soft daylight, no text",
  saw: "Fit woman sitting on a mat in a bright minimal studio, legs wide and straight, arms out to the sides, twisting and reaching one hand past the opposite foot, then rolling up, high angle, soft daylight, no text",
  swan: "Fit woman lying face down on a mat in a bright minimal studio, hands under her shoulders, lifting her chest into a smooth back extension and lowering again, side view, soft daylight, no text",
  "side-kick-series":
    "Fit woman lying on her side on a mat in a bright minimal studio, propped on her forearm, top leg at hip height swinging forward and back with still hips, side view, soft daylight, no text",
  swimming:
    "Fit woman lying face down on a mat in a bright minimal studio, arms and legs lifted and fluttering in small quick beats with opposite arm and leg, chest lifted, high side view, soft daylight, no text",
  teaser:
    "Fit woman on a mat in a bright minimal studio, rolling up into a V shape balance with straight legs at an angle and arms reaching along them, holding steady, side view, soft daylight, no text",
};

const available = (cmd) =>
  import("node:child_process").then(({ spawnSync }) => spawnSync(cmd, ["-version"], { stdio: "ignore" }).status === 0);

async function download(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed (${res.status}) for ${url.split("?")[0]}`);
  await writeFile(dest, Buffer.from(await res.arrayBuffer()));
}

async function main() {
  await mkdir(outDir, { recursive: true });

  const ffmpeg = (await available("ffmpeg")) && (await available("ffprobe"));
  if (!ffmpeg) {
    console.warn("ffmpeg not found — saving original clips as-is, no loop crossfade or poster extraction.");
  }

  for (const [slug, url] of Object.entries(CLIPS)) {
    const raw = path.join(outDir, `${slug}.raw.mp4`);
    const video = path.join(outDir, `${slug}.mp4`);
    const poster = path.join(outDir, `${slug}.jpg`);

    console.log(`Downloading ${slug}…`);
    await download(url, raw);

    if (ffmpeg) {
      encodeLoop(raw, video);
      extractPoster(video, poster);
      await rm(raw);
    } else {
      await rm(video, { force: true });
      await rename(raw, video);
    }
  }

  let source = await readFile(exercisesPath, "utf8");
  for (const slug of Object.keys(CLIPS)) {
    const pattern = new RegExp(`(slug: "${slug}",[\\s\\S]*?mistakes: \\[[\\s\\S]*?\\],)\\r?\\n(  \\},)`);
    source = source.replace(
      pattern,
      `$1\r\n    video: { src: "/media/exercises/${slug}.mp4", poster: "/media/exercises/${slug}.jpg" },\r\n$2`,
    );
  }
  await writeFile(exercisesPath, source);

  console.log("Done — clips are in public/media/exercises and data/exercises.ts now points at them.");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
