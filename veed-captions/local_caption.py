#!/usr/bin/env python3
"""
local_caption.py — free, fully local caption burner (no paid API).

Transcribes a video's audio with faster-whisper (open-source, runs on CPU) and
burns the captions into the video with ffmpeg. Caption colour defaults to orange.

Nothing is uploaded anywhere and nothing is billed — this is the "free" path that
lives alongside the VEED/fal API tool (caption.mjs).

Usage:
  python3 local_caption.py --input clip.mov [options]

Options:
  --input,  -i   Local video file (required)
  --out,    -o   Output path (default: output/<name>-captioned.mp4)
  --text,   -t   Burn this exact caption text instead of transcribing the audio
                 (use for silent clips / manual captions). Use \n for line breaks.
  --start        With --text: seconds the caption appears  (default: 0)
  --end          With --text: seconds the caption disappears (default: end of clip)
  --color,  -c   Caption colour: a name (orange, white, yellow, red, green,
                 cyan, blue, magenta, black) or #RRGGBB   (default: orange)
  --model,  -m   faster-whisper model size: tiny|base|small|medium|large-v3
                 (default: base — good accuracy, small download)
  --language,-l  Force a language code (e.g. en, ar). Omit to auto-detect.
  --font-size    Caption font size in px. Omit to scale from video height.
  --position     bottom | middle | top   (default: bottom)

Deps (already handled by the setup step):
  pip install faster-whisper imageio-ffmpeg
"""

import argparse
import os
import subprocess
import sys
import tempfile

# ---- colour handling ---------------------------------------------------------
# ASS uses &HAABBGGRR (alpha, blue, green, red) — note the reversed byte order.
NAMED_COLORS = {
    "orange":  (255, 165, 0),
    "white":   (255, 255, 255),
    "yellow":  (255, 255, 0),
    "red":     (255, 0, 0),
    "green":   (0, 200, 0),
    "cyan":    (0, 255, 255),
    "blue":    (0, 128, 255),
    "magenta": (255, 0, 255),
    "black":   (0, 0, 0),
}


def rgb_to_ass(rgb):
    r, g, b = rgb
    return f"&H00{b:02X}{g:02X}{r:02X}"


def parse_color(value):
    v = value.strip().lower()
    if v in NAMED_COLORS:
        return NAMED_COLORS[v]
    if v.startswith("#"):
        v = v[1:]
    if len(v) == 6:
        try:
            return (int(v[0:2], 16), int(v[2:4], 16), int(v[4:6], 16))
        except ValueError:
            pass
    raise SystemExit(f"✖ Unknown colour '{value}'. Use a name or #RRGGBB.")


def ffmpeg_exe():
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        # fall back to a system ffmpeg if present
        return "ffmpeg"


def fmt_ts(seconds):
    """Seconds -> ASS timestamp H:MM:SS.cc"""
    if seconds < 0:
        seconds = 0
    cs = int(round(seconds * 100))
    h, cs = divmod(cs, 360000)
    m, cs = divmod(cs, 6000)
    s, cs = divmod(cs, 100)
    return f"{h:d}:{m:02d}:{s:02d}.{cs:02d}"


def ass_escape(text):
    # Normalise real newlines and the literal sequence "\n" to a placeholder,
    # neutralise ASS override syntax, then emit ASS hard line breaks ("\N").
    text = text.replace("\r\n", "\n").replace("\\n", "\n")
    text = text.replace("{", "(").replace("}", ")").replace("\\", "")
    return text.replace("\n", "\\N").strip()


def build_ass(segments, width, height, color_rgb, font_size, position):
    if not font_size:
        # ~1/22 of the height reads well for burned-in social captions
        font_size = max(18, round(height / 22))

    primary = rgb_to_ass(color_rgb)
    outline = "&H00000000"  # black outline for legibility on any footage
    back = "&H64000000"     # semi-transparent shadow

    alignment = {"bottom": 2, "middle": 5, "top": 8, "center": 5}.get(position, 2)
    margin_v = max(24, round(height / 18))

    header = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {width}
PlayResY: {height}
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Caption,DejaVu Sans,{font_size},{primary},{primary},{outline},{back},1,0,0,0,100,100,0,0,1,{max(2, round(font_size/16))},1,{alignment},40,40,{margin_v},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    lines = []
    for seg in segments:
        text = ass_escape(seg["text"])
        if not text:
            continue
        lines.append(
            f"Dialogue: 0,{fmt_ts(seg['start'])},{fmt_ts(seg['end'])},Caption,,0,0,0,,{text}"
        )
    return header + "\n".join(lines) + "\n"


def transcribe(input_path, model_size, language):
    from faster_whisper import WhisperModel

    print(f"▶ Loading faster-whisper model '{model_size}' (first run downloads it)…")
    model = WhisperModel(model_size, device="cpu", compute_type="int8")

    print("▶ Transcribing audio locally…")
    segments, info = model.transcribe(
        input_path,
        language=language,
        vad_filter=True,
        beam_size=5,
    )
    print(f"  detected language: {info.language} (p={info.language_probability:.2f})")

    out = []
    for s in segments:
        text = s.text.strip()
        if text:
            out.append({"start": s.start, "end": s.end, "text": text})
            print(f"  [{fmt_ts(s.start)} → {fmt_ts(s.end)}] {text}")
    return out


def video_dimensions(ff, input_path):
    # Parse "Stream ... 1920x1080" out of ffmpeg's banner.
    proc = subprocess.run([ff, "-i", input_path, "-hide_banner"],
                          stderr=subprocess.PIPE, stdout=subprocess.PIPE, text=True)
    import re
    for line in proc.stderr.splitlines():
        if "Video:" in line:
            m = re.search(r"(\d{2,5})x(\d{2,5})", line)
            if m:
                return int(m.group(1)), int(m.group(2))
    return 1920, 1080  # sensible default


def video_duration(ff, input_path):
    import re
    proc = subprocess.run([ff, "-i", input_path, "-hide_banner"],
                          stderr=subprocess.PIPE, stdout=subprocess.PIPE, text=True)
    m = re.search(r"Duration:\s*(\d+):(\d+):(\d+\.\d+)", proc.stderr)
    if m:
        h, mm, ss = int(m.group(1)), int(m.group(2)), float(m.group(3))
        return h * 3600 + mm * 60 + ss
    return None


def main():
    ap = argparse.ArgumentParser(description="Free local caption burner (orange by default).")
    ap.add_argument("--input", "-i", required=True)
    ap.add_argument("--out", "-o")
    ap.add_argument("--text", "-t", default=None,
                    help="Burn this exact text instead of transcribing (for silent/manual captions).")
    ap.add_argument("--start", type=float, default=0.0)
    ap.add_argument("--end", type=float, default=None)
    ap.add_argument("--color", "-c", default="orange")
    ap.add_argument("--model", "-m", default="base")
    ap.add_argument("--language", "-l", default=None)
    ap.add_argument("--font-size", type=int, default=None)
    ap.add_argument("--position", default="bottom",
                    choices=["bottom", "middle", "top", "center"])
    args = ap.parse_args()

    if not os.path.isfile(args.input):
        raise SystemExit(f"✖ Input file not found: {args.input}")

    color_rgb = parse_color(args.color)
    ff = ffmpeg_exe()

    base = os.path.splitext(os.path.basename(args.input))[0]
    out_path = args.out or os.path.join("output", f"{base}-captioned.mp4")
    os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)

    if args.text:
        # Manual caption mode — no transcription. Turn literal "\n" into ASS line breaks.
        end = args.end if args.end is not None else (video_duration(ff, args.input) or 3600)
        segments = [{"start": args.start, "end": end, "text": args.text}]
        print(f'▶ Manual caption: "{args.text}"  [{fmt_ts(args.start)} → {fmt_ts(end)}]')
    else:
        segments = transcribe(args.input, args.model, args.language)
        if not segments:
            raise SystemExit(
                "✖ No speech detected — nothing to transcribe.\n"
                "  If this is a silent clip, pass the caption yourself with --text \"...\"."
            )

    width, height = video_dimensions(ff, args.input)
    ass = build_ass(segments, width, height, color_rgb, args.font_size, args.position)

    with tempfile.NamedTemporaryFile("w", suffix=".ass", delete=False, encoding="utf-8") as f:
        f.write(ass)
        ass_path = f.name

    # Also drop the .ass next to the output so it can be tweaked/reused.
    sidecar = os.path.splitext(out_path)[0] + ".ass"
    with open(sidecar, "w", encoding="utf-8") as f:
        f.write(ass)

    print(f"\n▶ Burning {args.color} captions into the video with ffmpeg…")
    # Escape the subtitles path for the ffmpeg filtergraph.
    esc = ass_path.replace("\\", "\\\\").replace(":", "\\:").replace("'", "\\'")
    cmd = [
        ff, "-y", "-i", args.input,
        "-vf", f"subtitles='{esc}'",
        "-c:a", "copy",
        "-c:v", "libx264", "-preset", "medium", "-crf", "18",
        "-movflags", "+faststart",
        out_path,
    ]
    proc = subprocess.run(cmd, stderr=subprocess.PIPE, stdout=subprocess.PIPE, text=True)
    if proc.returncode != 0:
        sys.stderr.write(proc.stderr[-2000:])
        raise SystemExit("✖ ffmpeg failed while burning captions.")

    print("\n✓ Done.")
    print(f"  Saved:  {os.path.abspath(out_path)}")
    print(f"  Subs:   {os.path.abspath(sidecar)}  (edit + re-burn if you like)")
    os.unlink(ass_path)


if __name__ == "__main__":
    main()
