# Syncing Outputs from Private Repo

This public repo (`nba_fantasy_recaps`) contains **only public-safe outputs** for GitHub Pages.

## Workflow Overview

```
Private Repo (nba_fb)                    Public Repo (nba_fantasy_recaps)
├── espn_api/ (with credentials)    →    (NEVER SYNC)
├── analytics/                        →    (NEVER SYNC)
├── data/recap_week_X.md            →    md_recaps/recap_week_X.md ✅
├── data/league_metadata.json        →    data/league_metadata.json ✅
└── outputs/recaps/week-X.html       →    recaps/week-0X.html ✅
```

## What Gets Synced (Public-Safe Only)

✅ **Safe to publish:**
- `md_recaps/*.md` - Markdown recap files
- `recaps/*.html` - Generated HTML recap pages
- `data/league_metadata.json` + `.js` - Safe metadata (team names, logos, NO credentials)
- `data/recaps_index.json` + `.js` - Recap index with quick hits

❌ **NEVER sync:**
- ESPN API credentials (cookies, SWID, espn_s2)
- Email addresses or private member IDs
- Any `.env`, `.config`, or secrets files
- Python source code from the private repo

## How to Sync (From Private Repo)

### Option 1: Manual Copy Script

In your **private repo** (`nba_fb`), create a script `sync_to_public.py`:

```python
#!/usr/bin/env python3
"""
Syncs public-safe outputs from private repo to public GitHub Pages repo.
Run this from: C:\Users\chris\OneDrive\Documents\nba_fb\
"""
import shutil
import json
from pathlib import Path

PRIVATE_REPO = Path(__file__).parent
PUBLIC_REPO = Path(r"C:\Users\chris\OneDrive\Documents\nba_fantasy_recaps")

def sync_markdown():
    """Copy markdown recaps"""
    src = PRIVATE_REPO / "data"
    dst = PUBLIC_REPO / "md_recaps"
    dst.mkdir(exist_ok=True)
    
    for md_file in src.glob("recap_week_*.md"):
        shutil.copy2(md_file, dst / md_file.name)
        print(f"✅ Copied {md_file.name}")

def sync_metadata():
    """Copy safe metadata (sanitize first!)"""
    src = PRIVATE_REPO / "data" / "league_metadata.json"
    if not src.exists():
        print("⚠️  league_metadata.json not found in private repo")
        return
    
    with open(src) as f:
        data = json.load(f)
    
    # Sanitize: remove any risky fields
    safe_data = {
        "season": data.get("season"),
        "week": data.get("week"),
        "league_name": data.get("league_name"),
        "scoring_type": data.get("scoring_type"),
        "teams": [
            {
                "team_id": t.get("team_id"),
                "team_name": t.get("team_name"),
                "owner": t.get("owner"),  # or "owner_name" if you use that
                "logo_url": t.get("logo_url")
            }
            for t in data.get("teams", [])
        ]
    }
    
    # Write JSON
    dst_json = PUBLIC_REPO / "data" / "league_metadata.json"
    dst_json.parent.mkdir(exist_ok=True)
    with open(dst_json, "w") as f:
        json.dump(safe_data, f, indent=2)
    print("✅ Copied league_metadata.json")
    
    # Write JS version
    dst_js = PUBLIC_REPO / "data" / "league_metadata.js"
    with open(dst_js, "w") as f:
        f.write("// Generated from league_metadata.json\n")
        f.write("window.LEAGUE_METADATA = ")
        json.dump(safe_data, f, indent=2)
        f.write(";\n")
    print("✅ Generated league_metadata.js")

def sync_recaps_index():
    """Generate recaps_index from markdown files"""
    recaps = []
    md_dir = PUBLIC_REPO / "md_recaps"
    
    for md_file in sorted(md_dir.glob("recap_week_*.md"), reverse=True):
        # Extract week number
        week_num = int(md_file.stem.split("_")[-1])
        
        # Read markdown to extract quick hits from Storylines section
        with open(md_file) as f:
            content = f.read()
        
        quick_hits = []
        in_storylines = False
        for line in content.split("\n"):
            if line.startswith("## 📖 Storylines"):
                in_storylines = True
                continue
            if in_storylines and line.startswith("##"):
                break
            if in_storylines and line.strip().startswith("-"):
                # Extract bullet point
                bullet = line.strip().lstrip("- ").strip()
                if bullet:
                    quick_hits.append(bullet)
        
        # Extract capture date from end of file
        captured_at = None
        if "_Data captured" in content:
            import re
            match = re.search(r"_Data captured (\d{4}-\d{2}-\d{2} \d{2}:\d{2})", content)
            if match:
                from datetime import datetime
                dt = datetime.strptime(match.group(1), "%Y-%m-%d %H:%M")
                captured_at = dt.isoformat() + "Z"
        
        recaps.append({
            "week": week_num,
            "captured_at": captured_at or "",
            "url": f"recaps/week-{week_num:02d}.html",
            "quick_hits": quick_hits[:6]  # Limit to 6
        })
    
    # Write JSON
    index_data = {"recaps": recaps}
    dst_json = PUBLIC_REPO / "data" / "recaps_index.json"
    with open(dst_json, "w") as f:
        json.dump(index_data, f, indent=2)
    print("✅ Generated recaps_index.json")
    
    # Write JS version
    dst_js = PUBLIC_REPO / "data" / "recaps_index.js"
    with open(dst_js, "w") as f:
        f.write("// Generated from recaps_index.json\n")
        f.write("window.RECAPS_INDEX = ")
        json.dump(index_data, f, indent=2)
        f.write(";\n")
    print("✅ Generated recaps_index.js")

if __name__ == "__main__":
    print("🔄 Syncing outputs to public repo...\n")
    sync_markdown()
    sync_metadata()
    sync_recaps_index()
    print("\n✅ Sync complete! Review changes in public repo before committing.")
```

### Option 2: After Generating HTML Recaps

If your private repo generates HTML files (e.g., `outputs/recaps/week-08.html`), also sync those:

```python
def sync_html_recaps():
    """Copy generated HTML recap pages"""
    src = PRIVATE_REPO / "outputs" / "recaps"  # Adjust path as needed
    dst = PUBLIC_REPO / "recaps"
    dst.mkdir(exist_ok=True)
    
    for html_file in src.glob("week-*.html"):
        shutil.copy2(html_file, dst / html_file.name)
        print(f"✅ Copied {html_file.name}")
```

## Security Checklist Before Committing

Before pushing to GitHub, verify:

- [ ] No `.env`, `.config`, or credential files
- [ ] No ESPN cookies/tokens in any JSON/JS files
- [ ] `league_metadata.json` only has: team_name, logo_url, owner (no emails/IDs)
- [ ] All markdown files are public-safe
- [ ] HTML files don't contain any API keys or secrets

## GitHub Pages Setup

1. Push this repo to GitHub
2. Go to repo Settings → Pages
3. Select branch (usually `main`) and `/ (root)` folder
4. Your site will be live at: `https://<username>.github.io/nba_fantasy_recaps/`

