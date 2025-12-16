# Public GitHub Pages Repo Setup

This document describes how to sync outputs from the private repo to this public GitHub Pages repository.

## Repository Structure

```
nba_fantasy_recaps/
├── assets/
│   ├── css/style.css
│   └── js/app.js
├── data/
│   ├── league_metadata.json    # Sanitized league metadata (with standings/power rankings)
│   ├── league_metadata.js      # JS version for browser
│   ├── recaps_index.json       # Index of all recaps
│   └── recaps_index.js         # JS version for browser
├── md_recaps/
│   ├── recap_week_1.md
│   ├── recap_week_2.md
│   └── ...
├── recaps/
│   ├── week-01.html            # Generated from markdown
│   ├── week-02.html
│   └── ...
├── scripts/
│   ├── extract_standings.py    # Extracts standings/power rankings from markdown
│   ├── generate_week_htmls.py  # Generates HTML from markdown
│   └── update_js_files.py      # Converts JSON to JS
└── index.html                  # Main landing page
```

## Sync Workflow

### From Private Repo

1. **Generate your weekly recap:**
   ```bash
   python fantasy_weekly_report_fast.py --week 8
   ```
   This creates `data/recap_week_8.md` in your private repo.

2. **Run the sync script** (see `sync_to_public.py` template below):
   ```bash
   python sync_to_public.py
   ```
   This script will:
   - Copy markdown files to `md_recaps/`
   - Generate HTML files in `recaps/`
   - Extract standings/power rankings and update metadata
   - Update recaps index
   - Generate JS files from JSON

3. **Review the changes** in the public repo

4. **Commit and push:**
   ```bash
   cd ../nba_fantasy_recaps
   git add .
   git commit -m "Update week 8 recap"
   git push
   ```

## What Gets Synced

✅ **Safe to publish:**
- Markdown recap files (`md_recaps/recap_week_*.md`)
- HTML recap pages (`recaps/week-*.html`) - generated from markdown
- Sanitized league metadata (team names, logos, standings, power rankings)
- Recaps index with quick hits

❌ **NEVER synced:**
- ESPN API credentials (cookies, SWID, espn_s2)
- Source code or analytics scripts
- `.env` files or configuration with secrets
- Email addresses or private member IDs

## Security Checklist

Before committing, verify:
- [ ] No `.env` or credential files
- [ ] No ESPN cookies/tokens in JSON/JS files
- [ ] `league_metadata.json` only has: team_name, logo_url, standing_rank, record, power_rank, power_movement
- [ ] All markdown files are public-safe
- [ ] HTML files don't contain API keys or secrets

## GitHub Pages Setup

1. Push this repo to GitHub
2. Go to repo Settings → Pages
3. Select branch (usually `main`) and `/ (root)` folder
4. Site will be live at: `https://<username>.github.io/nba_fantasy_recaps/`

## Data Files

### `league_metadata.json`
Contains public-safe league information:
- Season and week
- League name and scoring type
- Team names, IDs, and logo URLs
- **Standing rank and record** (from latest week)
- **Power rank and movement** (from latest week)

### `recaps_index.json`
Index of all available recaps:
- Week number
- Capture date
- URL to HTML page
- Quick hits (extracted from Storylines section)

Both files have `.js` versions for direct browser consumption (no server needed).

## Scripts in This Repo

### `scripts/extract_standings.py`
Extracts standings and power rankings from the latest week's markdown and updates `league_metadata.json`.

**Run after syncing new markdown:**
```bash
python scripts/extract_standings.py
```

### `scripts/generate_week_htmls.py`
Generates HTML recap pages from markdown files.

**Run after syncing new markdown:**
```bash
python scripts/generate_week_htmls.py
```

### `scripts/update_js_files.py`
Converts JSON files to JS files for browser compatibility.

**Run after updating JSON files:**
```bash
python scripts/update_js_files.py
```

