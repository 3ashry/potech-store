# veed-captions

A small, self-contained CLI that burns styled captions into a video using
**VEED's Subtitle API** (served via [fal.ai](https://fal.ai), model `veed/subtitles`).

It transcribes the audio, applies a caption style **preset**, and returns an MP4
with the subtitles burned in. Give it a local file or a public video URL and it
hands back a captioned `.mp4`.

> This tool is standalone and independent from the store app. It just happens to
> live in this repo under `veed-captions/`.

## 1. Get an API key

VEED's Subtitle API is accessed through fal.ai. Create a key at
**https://fal.ai/dashboard/keys** and copy it. Billing is roughly **$0.10 per
minute** of video (resolution/complexity multipliers apply).

## 2. Install

```bash
cd veed-captions
npm install
```

## 3. Run

```bash
# Local file (auto-uploaded to fal storage), default "glass" preset:
FAL_KEY=your_key node caption.mjs --input ./clip.mp4

# A public URL, a different preset, forced language:
FAL_KEY=your_key node caption.mjs --input https://example.com/clip.mp4 --preset whisper --language en

# Bring your own subtitles (skip auto-transcription):
FAL_KEY=your_key node caption.mjs --input ./clip.mp4 --srt ./clip.srt

# Custom output path:
FAL_KEY=your_key node caption.mjs -i ./clip.mp4 -o ./final.mp4
```

The captioned video is written to `output/<name>-captioned.mp4` by default.

Tip: instead of prefixing `FAL_KEY=` each time, export it once:
`export FAL_KEY=your_key`.

## Options

| Flag | Alias | Description |
|------|-------|-------------|
| `--input` | `-i` | Local video file **or** public `https` URL (required) |
| `--preset` | `-p` | Caption style preset (default `glass`) |
| `--language` | `-l` | Language code (`en`, `es`, `ar`, …). Omit to auto-detect. |
| `--srt` | | Path to an `.srt` to use instead of transcription |
| `--out` | `-o` | Output file path |
| `--list-presets` | | Print available style presets and exit |
| `--help` | `-h` | Show help |

## Presets

- **Dynamic** (animated, social-style): `glass`, `whisper`, `glide`, `glide2`,
  `fusion`, `terminal`, `handwritten`
- **Basic** (static): `simple`, `plain`, `beans`, `corpo`, `boo`, `shadeplay`,
  `casper`, `capri`, `lowkey`, `vinta`, `diego`, `ali`, `slay`, `kitty`,
  `hustle`, `karl`, `sprout`, `flex`, `mint`, `rizz`, `vegas`

Run `node caption.mjs --list-presets` to see them anytime.

## Supported input

MP4, MOV, and WebM — as a local file or a publicly reachable `https` URL.

## Free local mode (no API, no cost) — `local_caption.py`

If you don't want to pay for the API, use the fully local, free path. It burns
captions in with a bundled [ffmpeg](https://pypi.org/project/imageio-ffmpeg/) and,
for videos **with speech**, transcribes locally with
[faster-whisper](https://pypi.org/project/faster-whisper/). Captions default to
**orange**. Nothing is uploaded and nothing is billed.

```bash
pip install faster-whisper imageio-ffmpeg

# Auto-transcribe a talking video, orange captions at the bottom:
python3 local_caption.py --input clip.mp4

# Silent clip / manual caption text, centered, orange (use \n for line breaks):
python3 local_caption.py --input clip.mov \
  --text "TOTAL 42V MAX\nCordless Drill" --position center --color orange

# Timed manual caption (show from 1s to 4s), custom colour:
python3 local_caption.py -i clip.mp4 -t "50% OFF" --start 1 --end 4 -c "#FF7A00"
```

Key options: `--text/-t` (manual caption, skips transcription), `--start`/`--end`
(timing for `--text`), `--color/-c` (name or `#RRGGBB`, default orange),
`--position` (`bottom`|`middle`|`center`|`top`), `--font-size`, `--model`
(whisper size), `--language`. A `.ass` subtitle file is written next to the
output so you can tweak styling and re-burn.

> Note on transcription: faster-whisper downloads its model from Hugging Face on
> first run. In network-restricted environments where Hugging Face is blocked,
> transcription won't work — use `--text` to supply the caption yourself.

## Notes

- The `FAL_KEY` is read from the environment and never written to disk. Keep it
  out of source control.
- `output/` and `node_modules/` are git-ignored.
