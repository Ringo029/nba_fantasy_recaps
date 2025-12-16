#!/usr/bin/env python3
"""
Generate week HTML files from markdown recaps with dashboard-style formatting.
"""
import json
import re
from pathlib import Path

REPO_ROOT = Path(__file__).parent.parent
MD_DIR = REPO_ROOT / "md_recaps"
RECAPS_DIR = REPO_ROOT / "recaps"
DATA_DIR = REPO_ROOT / "data"

def extract_quick_hits(md_content):
    """Extract quick hits from Storylines section"""
    quick_hits = []
    in_storylines = False
    for line in md_content.split("\n"):
        if line.startswith("## 📖 Storylines"):
            in_storylines = True
            continue
        if in_storylines and line.startswith("##"):
            break
        if in_storylines and line.strip().startswith("- **"):
            # Extract bullet point
            bullet = line.strip().lstrip("- ").strip()
            if bullet:
                quick_hits.append(bullet)
    return quick_hits[:4]  # Top 4

def extract_week_number(md_content):
    """Extract week number from markdown"""
    match = re.search(r"# FANTASY WEEK (\d+) RECAP", md_content)
    return int(match.group(1)) if match else None

def generate_week_html(week_num, md_content, recaps_index):
    """Generate HTML for a single week"""
    quick_hits = extract_quick_hits(md_content)
    
    # Find this week's recap data
    week_recap = None
    for recap in recaps_index.get("recaps", []):
        if recap.get("week") == week_num:
            week_recap = recap
            break
    
    # Extract stats from quick hits (clean markdown formatting)
    team_of_week = "—"
    mvp = "—"
    beatdown = "—"
    closest = "—"
    
    for hit in quick_hits:
        # Remove markdown bold markers
        clean_hit = hit.replace("**", "").strip()
        if "Team of the Week" in clean_hit:
            team_of_week = clean_hit.split(":")[-1].strip() if ":" in clean_hit else "—"
        elif "MVP" in clean_hit or "Weekly MVP" in clean_hit:
            mvp = clean_hit.split(":")[-1].strip() if ":" in clean_hit else "—"
        elif "Beatdown" in clean_hit or "Biggest Beatdown" in clean_hit:
            beatdown = clean_hit.split(":")[-1].strip() if ":" in clean_hit else "—"
        elif "Closest" in clean_hit or "Closest Matchup" in clean_hit:
            closest = clean_hit.split(":")[-1].strip() if ":" in clean_hit else "—"
    
    # Get all weeks for navigation
    all_weeks = sorted([r["week"] for r in recaps_index.get("recaps", [])], reverse=True)
    prev_week = None
    next_week = None
    if week_num in all_weeks:
        idx = all_weeks.index(week_num)
        if idx < len(all_weeks) - 1:
            prev_week = all_weeks[idx + 1]
        if idx > 0:
            next_week = all_weeks[idx - 1]
    
    # Escape markdown for embedding in JS
    md_escaped = json.dumps(md_content)
    
    html = f'''<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Week {week_num:02d} Fantasy Recap</title>
  <meta name="description" content="Week {week_num} fantasy basketball recap." />
  <meta name="referrer" content="no-referrer" />
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🏀</text></svg>" />
  <link rel="stylesheet" href="../assets/css/style.css" />
  <!-- Marked for Markdown parsing -->
  <script src="https://cdn.jsdelivr.net/npm/marked@11.1.1/marked.min.js"></script>
  <!-- DOMPurify for safe HTML sanitization -->
  <script src="https://cdn.jsdelivr.net/npm/dompurify@3.0.6/dist/purify.min.js"></script>
</head>
<body>
  <header class="site-header">
    <h1>🏀 Fantasy Week {week_num:02d} Recap</h1>
    <p class="sub">Full weekly breakdown and analysis</p>
  </header>

  <main class="container">
    <!-- Hero Summary Card -->
    <section id="hero-summary" class="card hero-card">
      <div class="hero-header">
        <h1 id="hero-title" class="hero-title">🏀 Fantasy Week {week_num:02d} Overview</h1>
        <div id="hero-stats" class="hero-stats">
          <div class="stat-item">
            <span class="stat-label">Team of the Week:</span>
            <span id="stat-top-team" class="stat-value">{team_of_week}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">MVP:</span>
            <span id="stat-mvp" class="stat-value">{mvp}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Beatdown:</span>
            <span id="stat-beatdown" class="stat-value">{beatdown}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Closest:</span>
            <span id="stat-closest" class="stat-value">{closest}</span>
          </div>
        </div>
      </div>
      <div id="week-nav" class="week-nav">
        <a href="../index.html" class="btn" style="margin-right: auto;">← Back to Home</a>
        {f'<a href="week-{prev_week:02d}.html" class="nav-btn">⬅ Week {prev_week:02d}</a>' if prev_week else '<span class="nav-btn" style="opacity: 0.4; cursor: not-allowed;">⬅</span>'}
        <select id="week-select" class="week-select">
          {''.join([f'<option value="{w}" {"selected" if w == week_num else ""}>Week {w:02d}</option>' for w in all_weeks])}
        </select>
        {f'<a href="week-{next_week:02d}.html" class="nav-btn">Week {next_week:02d} ➡</a>' if next_week else '<span class="nav-btn" style="opacity: 0.4; cursor: not-allowed;">➡</span>'}
      </div>
    </section>

    <!-- Weekly Recap -->
    <section class="card recap-section">
      <div class="recap-divider">
        <span class="divider-line"></span>
        <h2 class="divider-title">WEEKLY RECAP</h2>
        <span class="divider-line"></span>
      </div>
      <div id="recap" class="md"></div>
    </section>
  </main>

  <footer class="site-footer">
    <small>Fantasy Weekly Recaps • Mobile-friendly • WhatsApp-optimized</small>
  </footer>

  <script>
    // Embedded markdown content
    const markdownContent = {md_escaped};
    
    // Configure marked
    marked.setOptions({{
      breaks: true,
      gfm: true,
      headerIds: true,
      mangle: false
    }});
    
    // Render markdown
    const html = marked.parse(markdownContent);
    const sanitized = DOMPurify.sanitize(html);
    document.getElementById('recap').innerHTML = sanitized;
    
    // Week selector navigation
    document.getElementById('week-select').addEventListener('change', function(e) {{
      const week = parseInt(e.target.value);
      window.location.href = `week-${{String(week).padStart(2, '0')}}.html`;
    }});
  </script>
</body>
</html>'''
    
    return html

def main():
    # Load recaps index
    with open(DATA_DIR / "recaps_index.json", encoding="utf-8") as f:
        recaps_index = json.load(f)
    
    # Process each markdown file
    for md_file in sorted(MD_DIR.glob("recap_week_*.md")):
        week_num = int(md_file.stem.split("_")[-1])
        
        with open(md_file, encoding="utf-8") as f:
            md_content = f.read()
        
        html = generate_week_html(week_num, md_content, recaps_index)
        
        # Write HTML file
        html_file = RECAPS_DIR / f"week-{week_num:02d}.html"
        with open(html_file, "w", encoding="utf-8") as f:
            f.write(html)
        
        print(f"Generated {html_file.name}")

if __name__ == "__main__":
    main()

