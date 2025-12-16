#!/usr/bin/env python3
"""Quick verification script to check sync status"""
import json
from pathlib import Path

REPO_ROOT = Path(__file__).parent.parent
DATA_DIR = REPO_ROOT / "data"
RECAPS_DIR = REPO_ROOT / "recaps"
MD_DIR = REPO_ROOT / "md_recaps"

print("Verifying sync status...\n")

# Check recaps index
with open(DATA_DIR / "recaps_index.json", encoding="utf-8") as f:
    recaps_idx = json.load(f)
recaps = recaps_idx.get("recaps", [])
print(f"[OK] Recaps index: {len(recaps)} weeks")
for r in recaps:
    print(f"   Week {r['week']}: {r['url']}")

# Check HTML files
html_files = sorted(RECAPS_DIR.glob("week-*.html"))
print(f"\n[OK] HTML recap files: {len(html_files)}")
for f in html_files:
    print(f"   {f.name}")

# Check markdown files
md_files = sorted(MD_DIR.glob("recap_week_*.md"))
print(f"\n[OK] Markdown files: {len(md_files)}")
for f in md_files:
    print(f"   {f.name}")

# Check league metadata
with open(DATA_DIR / "league_metadata.json", encoding="utf-8") as f:
    metadata = json.load(f)
teams = metadata.get("teams", [])
print(f"\n[OK] League metadata: {len(teams)} teams")
teams_with_standings = sum(1 for t in teams if "standing_rank" in t)
teams_with_power = sum(1 for t in teams if "power_rank" in t)
print(f"   Teams with standings: {teams_with_standings}/{len(teams)}")
print(f"   Teams with power rankings: {teams_with_power}/{len(teams)}")

# Check JS files
js_files = [DATA_DIR / "league_metadata.js", DATA_DIR / "recaps_index.js"]
print(f"\n[OK] JS data files: {len(js_files)}")
for f in js_files:
    if f.exists():
        print(f"   {f.name} [OK]")
    else:
        print(f"   {f.name} [MISSING]")

print("\n[OK] Verification complete!")

