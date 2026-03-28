#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
import sys
from typing import Any, Iterable


def parse_args() -> argparse.Namespace:
  parser = argparse.ArgumentParser()
  parser.add_argument("--video-id", required=True)
  parser.add_argument("--languages", default="")
  return parser.parse_args()


def parse_languages(raw: str) -> list[str]:
  if not raw:
    return []
  return [token.strip() for token in raw.split(",") if token.strip()]


def format_clock(seconds: float) -> str:
  safe = max(0, int(seconds))
  h = safe // 3600
  m = (safe % 3600) // 60
  s = safe % 60
  if h > 0:
    return f"{h:02d}:{m:02d}:{s:02d}"
  return f"{m:02d}:{s:02d}"


def normalize_text(value: Any) -> str:
  text = str(value or "")
  text = re.sub(r"\s+", " ", text).strip()
  return text


def parse_start_seconds(row: dict[str, Any]) -> float | None:
  if "startMs" in row:
    try:
      return max(0.0, float(row.get("startMs", 0)) / 1000.0)
    except Exception:
      return None
  if "start" in row:
    try:
      return max(0.0, float(row.get("start", 0)))
    except Exception:
      return None
  return None


def normalize_rows(rows: Iterable[dict[str, Any]]) -> list[dict[str, Any]]:
  timeline: list[dict[str, Any]] = []
  for row in rows:
    text = normalize_text(row.get("text", ""))
    if not text:
      continue
    seconds = parse_start_seconds(row)
    if seconds is None:
      continue
    safe_seconds = max(0.0, float(seconds))
    start_ms = int(round(safe_seconds * 1000))
    timestamp = format_clock(seconds)
    if timeline:
      previous = timeline[-1]
      if previous["startMs"] == start_ms and previous["text"] == text:
        continue
    timeline.append(
      {
        "timestamp": timestamp,
        "seconds": round(safe_seconds, 3),
        "start": round(safe_seconds, 3),
        "startMs": start_ms,
        "text": text,
      }
    )
  return timeline


def map_error(error: Exception) -> tuple[str, str]:
  name = error.__class__.__name__
  mapping = {
    "TranscriptsDisabled": "transcripts_disabled",
    "NoTranscriptFound": "no_transcript_found",
    "VideoUnavailable": "video_unavailable",
    "RequestBlocked": "request_blocked",
    "IpBlocked": "ip_blocked",
    "AgeRestricted": "age_restricted",
    "YouTubeRequestFailed": "youtube_request_failed",
  }
  code = mapping.get(name, "youtube_transcript_api_error")
  return code, name


def fetch_rows(video_id: str, languages: list[str]) -> tuple[list[dict[str, Any]], str]:
  try:
    from youtube_transcript_api import YouTubeTranscriptApi  # type: ignore
  except Exception:
    raise RuntimeError("python_dependency_missing")

  api = None
  try:
    api = YouTubeTranscriptApi()
  except Exception:
    api = None

  if api is not None and hasattr(api, "fetch"):
    try:
      fetched = api.fetch(video_id, languages=languages if languages else None)
    except TypeError:
      fetched = api.fetch(video_id)

    language_code = str(getattr(fetched, "language_code", "") or "")
    if hasattr(fetched, "to_raw_data"):
      raw_rows = fetched.to_raw_data()
    elif isinstance(fetched, list):
      raw_rows = fetched
    else:
      raw_rows = list(fetched)
    return list(raw_rows), language_code

  if hasattr(YouTubeTranscriptApi, "get_transcript"):
    try:
      raw_rows = YouTubeTranscriptApi.get_transcript(
        video_id,
        languages=languages if languages else None,
      )
    except TypeError:
      raw_rows = YouTubeTranscriptApi.get_transcript(video_id)
    return list(raw_rows), ""

  raise RuntimeError("unsupported_api_surface")


def main() -> int:
  args = parse_args()
  video_id = str(args.video_id or "").strip()
  languages = parse_languages(str(args.languages or ""))

  if not video_id:
    payload = {"ok": False, "error": "missing_video_id"}
    print(json.dumps(payload, ensure_ascii=False))
    return 2

  try:
    rows, language_code = fetch_rows(video_id, languages)
    timeline = normalize_rows(rows)
    if not timeline:
      payload = {"ok": False, "error": "captions_not_found"}
      print(json.dumps(payload, ensure_ascii=False))
      return 2

    transcript = " ".join(item["text"] for item in timeline).strip()
    payload = {
      "ok": True,
      "source": "youtube-transcript-api",
      "videoId": video_id,
      "languageCode": language_code,
      "lineCount": len(timeline),
      "timeline": timeline,
      "transcript": transcript,
    }
    print(json.dumps(payload, ensure_ascii=False))
    return 0
  except RuntimeError as error:
    if str(error) == "python_dependency_missing":
      payload = {
        "ok": False,
        "error": "python_dependency_missing",
        "message": "youtube-transcript-api is not installed",
      }
      print(json.dumps(payload, ensure_ascii=False))
      return 2
    payload = {"ok": False, "error": str(error)}
    print(json.dumps(payload, ensure_ascii=False))
    return 2
  except Exception as error:  # noqa: BLE001
    code, error_type = map_error(error)
    payload = {
      "ok": False,
      "error": code,
      "errorType": error_type,
      "message": str(error),
    }
    print(json.dumps(payload, ensure_ascii=False))
    return 2


if __name__ == "__main__":
  sys.exit(main())
