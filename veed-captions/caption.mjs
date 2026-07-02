#!/usr/bin/env node
/**
 * veed-captions — burn styled captions into a video with VEED's Subtitle API (via fal.ai).
 *
 * The VEED Subtitle API transcribes a video's audio, applies a style preset, and
 * returns an MP4 with the captions burned in. It is served on fal.ai as the model
 * `veed/subtitles`. This script wraps the whole flow: (optionally) upload a local
 * file to fal storage, submit the job, stream progress logs, and download the result.
 *
 * Usage:
 *   FAL_KEY=xxxxx node caption.mjs --input ./clip.mp4 [options]
 *   FAL_KEY=xxxxx node caption.mjs --input https://example.com/clip.mp4 --preset whisper
 *
 * Options:
 *   --input,    -i   Local file path OR public/https video URL to caption   (required)
 *   --preset,   -p   Caption style preset (default: "glass")
 *   --language, -l   Language code (e.g. en, es, ar). Omit to auto-detect.
 *   --srt            Path to an .srt file to use instead of auto-transcription.
 *   --out,      -o   Output file path (default: ./output/<name>-captioned.mp4)
 *   --list-presets   Print the available style presets and exit.
 *   --help,     -h   Show this help.
 *
 * Env:
 *   FAL_KEY          Your fal.ai API key. Get one at https://fal.ai/dashboard/keys
 */

import { fal } from "@fal-ai/client";
import fs from "node:fs";
import path from "node:path";

const MODEL_ID = "veed/subtitles";

// Preset names as documented by the VEED Subtitle API on fal.ai.
const DYNAMIC_PRESETS = ["glass", "whisper", "glide", "glide2", "fusion", "terminal", "handwritten"];
const BASIC_PRESETS = [
  "simple", "plain", "beans", "corpo", "boo", "shadeplay", "casper", "capri",
  "lowkey", "vinta", "diego", "ali", "slay", "kitty", "hustle", "karl",
  "sprout", "flex", "mint", "rizz", "vegas",
];
const ALL_PRESETS = [...DYNAMIC_PRESETS, ...BASIC_PRESETS];

// ── tiny arg parser ───────────────────────────────────────────────────────────
function parseArgs(argv) {
  const alias = { i: "input", p: "preset", l: "language", o: "out", h: "help" };
  const opts = {};
  for (let n = 0; n < argv.length; n++) {
    let a = argv[n];
    if (!a.startsWith("-")) continue;
    a = a.replace(/^--?/, "");
    const key = alias[a] || a;
    if (key === "help" || key === "list-presets") { opts[key] = true; continue; }
    const next = argv[n + 1];
    if (next === undefined || next.startsWith("-")) { opts[key] = true; continue; }
    opts[key] = next;
    n++;
  }
  return opts;
}

function fail(msg) {
  console.error(`\n✖ ${msg}\n`);
  process.exit(1);
}

const HELP = `
veed-captions — burn styled captions into a video with VEED (via fal.ai)

Usage:
  FAL_KEY=xxxxx node caption.mjs --input <file-or-url> [options]

Options:
  -i, --input <path|url>   Local video file OR public https URL          (required)
  -p, --preset <name>      Caption style preset (default: glass)
  -l, --language <code>    Language code (en, es, ar, …). Omit = auto-detect.
      --srt <path>         Use this .srt instead of auto-transcription.
  -o, --out <path>         Output path (default: ./output/<name>-captioned.mp4)
      --list-presets       List available style presets and exit.
  -h, --help               Show this help.

Env:
  FAL_KEY                  fal.ai API key — https://fal.ai/dashboard/keys
`;

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  if (opts.help) { console.log(HELP); return; }
  if (opts["list-presets"]) {
    console.log("\nDynamic presets:\n  " + DYNAMIC_PRESETS.join(", "));
    console.log("\nBasic presets:\n  " + BASIC_PRESETS.join(", ") + "\n");
    return;
  }

  const apiKey = process.env.FAL_KEY;
  if (!apiKey) {
    fail(
      "FAL_KEY is not set.\n" +
      "  VEED's Subtitle API is served through fal.ai. Create a key at:\n" +
      "    https://fal.ai/dashboard/keys\n" +
      "  then run:  FAL_KEY=your_key node caption.mjs --input <file-or-url>"
    );
  }

  const input = opts.input;
  if (!input || input === true) fail("--input is required (a local file path or a public https video URL).");

  const preset = (opts.preset && opts.preset !== true) ? opts.preset : "glass";
  if (!ALL_PRESETS.includes(preset)) {
    fail(`Unknown preset "${preset}". Run with --list-presets to see valid names.`);
  }

  const language = (opts.language && opts.language !== true) ? opts.language : null;

  let srtContent;
  if (opts.srt && opts.srt !== true) {
    if (!fs.existsSync(opts.srt)) fail(`SRT file not found: ${opts.srt}`);
    srtContent = fs.readFileSync(opts.srt, "utf8");
  }

  fal.config({ credentials: apiKey });

  // 1. Resolve the video into a URL fal can read.
  const isUrl = /^https?:\/\//i.test(input);
  let videoUrl;
  let baseName;

  if (isUrl) {
    videoUrl = input;
    baseName = sanitizeName(path.basename(new URL(input).pathname) || "video");
  } else {
    if (!fs.existsSync(input)) fail(`Input file not found: ${input}`);
    baseName = sanitizeName(path.basename(input, path.extname(input)));
    console.log(`↑ Uploading "${input}" to fal storage…`);
    const buffer = fs.readFileSync(input);
    const blob = new Blob([buffer], { type: contentTypeFor(input) });
    videoUrl = await fal.storage.upload(blob);
    console.log(`  uploaded → ${videoUrl}`);
  }

  const outPath = (opts.out && opts.out !== true)
    ? opts.out
    : path.join("output", `${baseName}-captioned.mp4`);

  // 2. Submit the captioning job and stream progress.
  const input_payload = { video_url: videoUrl, preset };
  if (language) input_payload.language = language;
  if (srtContent) input_payload.srtContent = srtContent;

  console.log(`\n▶ Captioning with VEED (model: ${MODEL_ID}, preset: ${preset}${language ? ", language: " + language : ", auto-detect"})…`);

  const result = await fal.subscribe(MODEL_ID, {
    input: input_payload,
    logs: true,
    onQueueUpdate: (update) => {
      if (update.status === "IN_PROGRESS" && Array.isArray(update.logs)) {
        update.logs.map((l) => l.message).filter(Boolean).forEach((m) => console.log("  " + m));
      } else if (update.status) {
        console.log(`  status: ${update.status}`);
      }
    },
  });

  const data = result?.data ?? result;
  const outVideoUrl = data?.video?.url;
  if (!outVideoUrl) {
    console.error("Unexpected response from VEED API:", JSON.stringify(data, null, 2));
    fail("Could not find the captioned video URL in the API response.");
  }

  // 3. Download the finished MP4.
  fs.mkdirSync(path.dirname(path.resolve(outPath)), { recursive: true });
  console.log(`\n↓ Downloading captioned video…`);
  const res = await fetch(outVideoUrl);
  if (!res.ok) fail(`Failed to download result (${res.status} ${res.statusText}).`);
  const arrayBuf = await res.arrayBuffer();
  fs.writeFileSync(outPath, Buffer.from(arrayBuf));

  console.log(`\n✓ Done.`);
  console.log(`  Saved:  ${path.resolve(outPath)}`);
  console.log(`  Source: ${outVideoUrl}`);
  if (result?.requestId) console.log(`  fal request id: ${result.requestId}`);
}

function sanitizeName(name) {
  return (name || "video").replace(/[^\w.-]+/g, "_").replace(/\.[^.]+$/, "") || "video";
}

function contentTypeFor(file) {
  const ext = path.extname(file).toLowerCase();
  if (ext === ".mov") return "video/quicktime";
  if (ext === ".webm") return "video/webm";
  return "video/mp4";
}

main().catch((err) => {
  console.error("\n✖ Error:", err?.message || err);
  if (err?.body) console.error(JSON.stringify(err.body, null, 2));
  process.exit(1);
});
