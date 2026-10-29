"""Read-only duration measurement. Requires ffprobe on PATH; Python standard library only."""
import argparse
import json
import math
import subprocess
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit


def nonnegative(value):
    number = float(value)
    if not math.isfinite(number) or number < 0:
        raise argparse.ArgumentTypeError("must be finite and nonnegative")
    return number


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", help="local audio file or public HTTP(S) URL")
    parser.add_argument("--song", type=Path, help="local generated song JSON")
    parser.add_argument("--count-in", type=nonnegative)
    parser.add_argument("--expect", type=nonnegative)
    parser.add_argument("--tolerance", type=nonnegative, default=0.02)
    args = parser.parse_args()
    source = urlsplit(args.source)
    if source.scheme and source.scheme not in ("http", "https"):
        parser.error("source must be a local path or HTTP(S) URL")
    if source.scheme and (source.username or source.password):
        parser.error("credential-bearing URLs are not supported")
    label = urlunsplit((source.scheme, source.netloc, source.path, "", "")) if source.scheme else str(Path(args.source).resolve())
    try:
        result = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "json", "-i", args.source],
            capture_output=True, text=True, timeout=45, check=True,
        )
        duration = float(json.loads(result.stdout)["format"]["duration"])
        if not math.isfinite(duration) or duration <= 0:
            raise ValueError("invalid media duration")
        report = {"source": label, "encodedDurationSeconds": duration}
        if args.song:
            song = json.loads(args.song.read_text())
            for key in ("duration", "end", "tail"):
                value = song.get(key)
                if isinstance(value, (int, float)) and math.isfinite(value):
                    report[{"duration": "metadataDurationSeconds", "end": "finalHitSeconds", "tail": "resultTailSeconds"}[key]] = value
            if "metadataDurationSeconds" in report:
                report["metadataDifferenceSeconds"] = duration - report["metadataDurationSeconds"]
            notes = song.get("notes", [])
            if notes:
                report["firstChartNoteSeconds"] = min(note[0] for note in notes)
        if args.count_in is not None:
            report["applicationCountInSeconds"] = args.count_in
            report["encodedEndAfterPlaySeconds"] = duration + args.count_in
        if args.expect is not None:
            report["expectedDurationSeconds"] = args.expect
            report["withinTolerance"] = abs(duration - args.expect) <= args.tolerance
        print(json.dumps(report, indent=2))
        return 1 if report.get("withinTolerance") is False else 0
    except (OSError, ValueError, KeyError, TypeError, subprocess.SubprocessError):
        # ffprobe errors may echo URL query parameters. Do not forward raw diagnostics.
        parser.exit(2, "Could not measure audio or parse song metadata; check the input and ffprobe installation.\n")


if __name__ == "__main__":
    raise SystemExit(main())
