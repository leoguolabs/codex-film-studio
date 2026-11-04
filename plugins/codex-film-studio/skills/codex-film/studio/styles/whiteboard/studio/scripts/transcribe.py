#!/usr/bin/env python3
"""Independent, unprompted ASR review of hash-bound provider audio."""
import argparse
import difflib
import hashlib
import json
from pathlib import Path
import re
import platform
import time

STUDIO = Path(__file__).resolve().parents[1]
ROOT = STUDIO
DEFAULT_MODEL = "mlx-community/whisper-large-v3-turbo-q4"
# Exact numeric spellings used in these films. Unlisted digits remain visible
# in the comparison instead of being silently discarded by tokenization.
NUMBER_WORDS = dict(enumerate((
    "zero one two three four five six seven eight nine ten eleven twelve "
    "thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty"
).split()))
NUMBER_WORDS.update({
    32: "thirty two", 44: "forty four", 48: "forty eight", 50: "fifty",
    53: "fifty three", 74: "seventy four", 98: "ninety eight",
    704: "seven hundred and four", 1000: "one thousand", 6000: "six thousand",
    2026: "twenty twenty six",  # The narration explicitly speaks this as a year.
})


def recognizer_for(row, default_model, overrides):
    decision = overrides.get(row["id"])
    if decision is None:
        return default_model
    source_sha = hashlib.sha256(row["text"].encode()).hexdigest()
    if decision["source_sha256"] != source_sha:
        raise ValueError(f"Recognizer decision belongs to older narration: {row['id']}")
    if decision["audio_sha256"] != row["audio_sha256"]:
        raise ValueError(f"Recognizer decision belongs to another WAV: {row['id']}")
    return decision["model"]


def words(text):
    text = re.sub(r"\bai\b", "a i", text.lower())
    # Orthography only: these pairs are pronounced identically.
    text = re.sub(r"(?<=[a-z])['’](?=[a-z])", "", text)
    text = re.sub(r"\bbusywork\b", "busy work", text)
    text = re.sub(r"\bpractise\b", "practice", text)
    for separate, joined in (("pre registered", "preregistered"),
                             ("pre print", "preprint"), ("re read", "reread")):
        text = re.sub(r"\b" + separate.replace(" ", r"[\s-]+") + r"\b", joined, text)
    # Recognizers may write an algebraic term as 2x rather than "two x".
    text = re.sub(r"\b(\d+)(?=[xyz]\b)", r"\1 ", text)
    text = re.sub(r"\b\d+(?:,\d{3})*(?:\.\d+)?\b",
                  lambda m: (m[0] if "." in m[0] else
                             NUMBER_WORDS.get(int(m[0].replace(",", "")), m[0])), text)
    text = text.replace("%", " percent")
    return re.findall(r"[a-z]+|\d+(?:\.\d+)?", text)

def align_source(text, recognized):
    """Preserve source copy; use ASR spans only as timing observations."""
    source = text.split()
    normalize = lambda s: re.sub(r"[^a-z0-9]", "", s.lower())
    matcher = difflib.SequenceMatcher(None, [normalize(s) for s in source],
                                     [normalize(w["word"]) for w in recognized],
                                     autojunk=False)
    aligned = [None] * len(source)
    for tag, i, j, k, l in matcher.get_opcodes():
        if i == j:
            continue
        if tag == "equal":
            for a, b in zip(range(i, j), range(k, l)):
                aligned[a] = {"word": source[a], "start": recognized[b]["start"],
                              "end": recognized[b]["end"]}
        else:
            start = recognized[k]["start"] if k < len(recognized) else recognized[-1]["end"]
            end = recognized[l-1]["end"] if l > k else start + .02
            for a in range(i, j):
                aligned[a] = {"word": source[a], "start": start+(end-start)*(a-i)/(j-i),
                              "end": start+(end-start)*(a-i+1)/(j-i)}
    return aligned


def main():
    global ROOT
    parser = argparse.ArgumentParser()
    parser.add_argument("--edition", choices=["short", "long"], default="short")
    parser.add_argument("--follow", action="store_true")
    parser.add_argument("--model", help="Use this recognizer for every row, ignoring per-WAV decisions.")
    parser.add_argument("--backend", choices=["mlx", "faster-whisper"],
                        default="mlx" if platform.system() == "Darwin" and platform.machine() == "arm64" else "faster-whisper")
    args = parser.parse_args()
    ROOT = STUDIO if args.edition == "short" else STUDIO/"editions"/args.edition
    if args.backend == "mlx":
        import mlx_whisper
    else:
        try:
            from faster_whisper import WhisperModel
        except ImportError:
            raise SystemExit("Install faster-whisper for this backend: pip install faster-whisper")
        recognizers = {}
    default_model = DEFAULT_MODEL if args.backend == "mlx" else "large-v3-turbo"
    directory = ROOT / "media/asr"
    directory.mkdir(parents=True, exist_ok=True)
    expected_count = len(json.loads((ROOT / "content/narration.json").read_text()))
    while True:
        manifest = json.loads((ROOT / "media/audio/manifest.json").read_text())
        decisions_path = ROOT / "content/recognizer-decisions.json"
        overrides = (json.loads(decisions_path.read_text())
                     if decisions_path.exists() and not args.model and args.backend == "mlx" else {})
        reviews = []
        for row in manifest:
            audio = ROOT / row["path"]
            sha = hashlib.sha256(audio.read_bytes()).hexdigest()
            if sha != row["audio_sha256"]:
                raise ValueError("Audio changed since provider retrieval")
            model = recognizer_for(row, args.model or default_model, overrides)
            target = directory / f"{row['id']}-{sha[:12]}.json"
            if target.exists() and json.loads(target.read_text()).get("model") != model:
                # A second recognizer gets its own record; retain the first observation.
                model_key = re.sub(r"[^a-zA-Z0-9_-]", "-", model)
                target = directory / f"{row['id']}-{sha[:12]}-{model_key}.json"
            if target.exists():
                review = json.loads(target.read_text())
                if review.get("model") != model or review.get("audio_sha256") != sha:
                    raise ValueError("Cached transcription belongs to another model or audio.")
            else:
                if args.backend == "mlx":
                    result = mlx_whisper.transcribe(
                        str(audio), path_or_hf_repo=model, language="en",
                        word_timestamps=True, temperature=0, initial_prompt=None,
                        condition_on_previous_text=False, verbose=False)
                else:
                    if model not in recognizers:
                        recognizers[model] = WhisperModel(model, device="cpu", compute_type="int8")
                    segments, _ = recognizers[model].transcribe(
                        str(audio), language="en", word_timestamps=True, temperature=0,
                        initial_prompt=None, condition_on_previous_text=False)
                    rows = [{"start": seg.start, "end": seg.end, "text": seg.text,
                             "words": [{"word": w.word, "start": w.start, "end": w.end}
                                       for w in (seg.words or [])]} for seg in segments]
                    result = {"text": "".join(seg["text"] for seg in rows), "segments": rows}
                expected, actual = words(row["text"]), words(result["text"])
                changes = [dict(kind=tag, expected=expected[i:j], heard=actual[k:l])
                           for tag, i, j, k, l in difflib.SequenceMatcher(
                               None, expected, actual, autojunk=False).get_opcodes()
                           if tag != "equal"]
                review = {"id": row["id"], "audio_sha256": sha, "model": model,
                          "expected": row["text"], "transcript": result["text"],
                          "normalized_changes": changes,
                          "words": [w for seg in result["segments"] for w in seg.get("words", [])],
                          "segments": result["segments"],
                          "listening_review": "not established by ASR"}
                target.write_text(json.dumps(review, indent=2) + "\n")
                print(json.dumps({k: review[k] for k in
                                  ["id", "transcript", "normalized_changes"]}), flush=True)
            expected, actual = words(row["text"]), words(review["transcript"])
            review["normalized_changes"] = [
                dict(kind=tag, expected=expected[i:j], heard=actual[k:l])
                for tag, i, j, k, l in difflib.SequenceMatcher(
                    None, expected, actual, autojunk=False).get_opcodes() if tag != "equal"]
            review["aligned_source_words"] = align_source(row["text"], review["words"])
            target.write_text(json.dumps(review, indent=2) + "\n")
            reviews.append(review)
        temp = directory / "review.tmp"
        temp.write_text(json.dumps(reviews, indent=2) + "\n")
        temp.replace(directory / "review.json")
        if len(reviews) == expected_count or not args.follow:
            break
        time.sleep(15)


if __name__ == "__main__":
    main()
