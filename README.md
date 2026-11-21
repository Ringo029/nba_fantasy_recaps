# Fantasy Weekly Recaps

A mobile-friendly GitHub Pages site for weekly fantasy basketball recaps, optimized for WhatsApp sharing.

## 🎯 What This Is

This is a **public, static website** that displays:
- Weekly fantasy recaps with quick hits
- League standings and team info
- Power rankings and analytics
- All optimized for mobile/WhatsApp sharing

## 🔒 Security Model

This repo contains **only public-safe outputs**:
- ✅ Team names, logos, records
- ✅ Weekly recap summaries
- ✅ Pre-generated HTML pages
- ❌ **NO** ESPN API credentials
- ❌ **NO** private member data
- ❌ **NO** source code or analytics

All ESPN API calls happen in a **private repository**; only sanitized outputs are published here.

## 📁 Structure

```
/
├── index.html              # Homepage
├── assets/
│   ├── css/style.css      # Mobile-first dark theme
│   └── js/app.js          # Renders recaps + teams
├── data/
│   ├── league_metadata.json/js  # Safe league metadata
│   └── recaps_index.json/js     # List of all recaps
├── recaps/
│   └── week-XX.html       # Individual weekly recap pages
└── md_recaps/             # Source markdown files (for reference)
```

## Around The League

`articles/` holds member analysis. Those pages are separate from the generated recap. Unpublished drafts are not in this repository. The listing reads `data/articles/index.json`, so a published article can appear on an older week without another score export.

## 🚀 Usage

Just open `index.html` in your browser (or deploy to GitHub Pages). No server needed!

## 📝 Adding New Weeks

New recaps are synced from the private analytics repo. See `SYNC_README.md` for the workflow.

## 🛠️ Local Development

1. Clone this repo
2. Open `index.html` in your browser
3. That's it! Everything is static and works offline.

## 📱 WhatsApp Workflow

Each week:
1. Generate recap in private repo
2. Sync outputs to this repo (see `SYNC_README.md`)
3. Push to GitHub → auto-deploys to Pages
4. Share link in WhatsApp: `https://<username>.github.io/nba_fantasy_recaps/recaps/week-XX.html`

