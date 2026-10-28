"""Record the existing 2025-26 recap files without moving or deleting them.

Public league_metadata.json has season 2026. In this project that ESPN ending
year is the 2025-26 season. Original URLs under recaps/ stay where they are.
New files only add a season index and compatibility pages.
"""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SEASON_ID = "2025-26"
ESPN_YEAR = 2026


def main() -> None:
    metadata = json.loads((ROOT / "data" / "league_metadata.json").read_text(encoding="utf-8"))
    if int(metadata.get("season")) != ESPN_YEAR:
        raise SystemExit(
            f"Refusing to label this archive {SEASON_ID}: league_metadata season is {metadata.get('season')}"
        )
    indexed = {
        int(row["week"]): row
        for row in json.loads((ROOT / "data" / "recaps_index.json").read_text(encoding="utf-8")).get("recaps", [])
    }
    pages = sorted(ROOT.joinpath("recaps").glob("week-*.html"))
    recaps = []
    compat = ROOT / "seasons" / SEASON_ID / "recaps"
    compat.mkdir(parents=True, exist_ok=True)
    for page in pages:
        week = int(page.stem.split("-")[1])
        prior = indexed.get(week, {})
        url = f"recaps/week-{week:02d}.html"
        recaps.append({
            "season_id": SEASON_ID,
            "period_id": week,
            "week": week,
            "status": "final",
            "generated_at": prior.get("captured_at") or None,
            "url": url,
            "compatibility_url": f"seasons/{SEASON_ID}/recaps/week-{week:02d}.html",
            "archived_quick_hits": prior.get("quick_hits") or [],
            "note": "Preserved from the original recap page. This row was not rebuilt from a structured awards file.",
        })
        target = compat / f"week-{week:02d}.html"
        target.write_text(
            "\n".join([
                "<!doctype html>",
                "<html lang=\"en\"><head>",
                "<meta charset=\"utf-8\" />",
                f"<title>2025-26 week {week:02d}</title>",
                f"<link rel=\"canonical\" href=\"../../../{url}\" />",
                f"<meta http-equiv=\"refresh\" content=\"0; url=../../../{url}\" />",
                "</head><body>",
                f"<p><a href=\"../../../{url}\">Open the 2025-26 week {week:02d} recap</a></p>",
                "</body></html>",
                "",
            ]),
            encoding="utf-8",
        )
    recaps.sort(key=lambda row: row["period_id"], reverse=True)
    season_dir = ROOT / "data" / "seasons" / SEASON_ID
    season_dir.mkdir(parents=True, exist_ok=True)
    (season_dir / "recap_index.json").write_text(
        json.dumps({
            "schema_version": 1,
            "season_id": SEASON_ID,
            "espn_year": ESPN_YEAR,
            "source": "Existing recaps/week-XX.html and data/recaps_index.json. Original files were not moved.",
            "standings_note": "The team directory in data/league_metadata.json is the last published 2025-26 directory, not a per-week historical standings snapshot.",
            "recaps": recaps,
        }, indent=2),
        encoding="utf-8",
    )
    (ROOT / "data" / "seasons" / "index.json").write_text(
        json.dumps({
            "schema_version": 1,
            "seasons": [
                {
                    "season_id": SEASON_ID,
                    "label": "2025–26",
                    "archive": True,
                    "recap_index": f"data/seasons/{SEASON_ID}/recap_index.json",
                },
                {
                    "season_id": "2026-27",
                    "label": "2026–27",
                    "archive": False,
                    "recap_index": "data/seasons/2026-27/recap_index.json",
                },
            ],
        }, indent=2),
        encoding="utf-8",
    )
    latest = recaps[0] if recaps else None
    (ROOT / "data" / "hub").mkdir(parents=True, exist_ok=True)
    hub_path = ROOT / "data" / "hub" / "current.json"
    if not hub_path.exists():
        hub_path.write_text(
            json.dumps({
                "schema_version": 1,
                "season_id": "2026-27",
                "status": "unavailable",
                "generated_at": None,
                "source_updated_at": None,
                "matchup_period_id": None,
                "period_start": None,
                "period_end": None,
                "timezone": "America/New_York",
                "warnings": ["Live 2026-27 matchup progress has not been published."],
                "power_formula": None,
                "latest_final_recap": latest,
                "stale_after_hours": 6,
            }, indent=2),
            encoding="utf-8",
        )
    share = season_dir / "share.svg"
    share.write_text(
        """<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#0b0f14"/>
  <text x="80" y="280" fill="#e6edf3" font-size="64" font-family="Segoe UI, sans-serif">2025-26 recaps</text>
  <text x="80" y="360" fill="#9aa4b2" font-size="32" font-family="Segoe UI, sans-serif">Archived weekly reports</text>
</svg>
""",
        encoding="utf-8",
    )
    print(f"Archived {len(recaps)} existing recap pages for {SEASON_ID}")


if __name__ == "__main__":
    main()
