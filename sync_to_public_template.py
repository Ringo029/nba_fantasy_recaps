#!/usr/bin/env python3
"""
Sync public-safe outputs from private repo to public GitHub Pages repo.

Place this file in your PRIVATE repo (nba_fb) and customize the paths below.
Run this after generating a new weekly recap.
"""
import json
import shutil
import re
from pathlib import Path
from datetime import datetime

# ============================================================================
# CONFIGURE THESE PATHS FOR YOUR SETUP
# ============================================================================
PRIVATE_REPO = Path(__file__).parent  # Adjust if script is in subfolder
PUBLIC_REPO = Path(r"C:\Users\chris\OneDrive\Documents\nba_fantasy_recaps")

# Paths in private repo (adjust to match your structure)
PRIVATE_DATA_DIR = PRIVATE_REPO / "data"
PRIVATE_RECAP_PATTERN = "recap_week_*.md"  # Adjust if different

# ============================================================================
# SYNC FUNCTIONS
# ============================================================================

def sync_markdown():
    """Copy markdown recaps from private to public repo"""
    print("📄 Syncing markdown files...")
    dst = PUBLIC_REPO / "md_recaps"
    dst.mkdir(exist_ok=True)
    
    copied = 0
    for md_file in PRIVATE_DATA_DIR.glob(PRIVATE_RECAP_PATTERN):
        shutil.copy2(md_file, dst / md_file.name)
        print(f"  ✓ {md_file.name}")
        copied += 1
    
    print(f"  Copied {copied} markdown files\n")
    return copied > 0

def sanitize_metadata(src_data):
    """Remove any risky fields from metadata"""
    safe_data = {
        "season": src_data.get("season"),
        "week": src_data.get("week"),
        "league_name": src_data.get("league_name"),
        "scoring_type": src_data.get("scoring_type"),
        "teams": []
    }
    
    for team in src_data.get("teams", []):
        safe_team = {
            "team_id": team.get("team_id"),
            "team_name": team.get("team_name"),
            "owner": team.get("owner"),  # or "owner_name" if you use that
            "logo_url": team.get("logo_url")
            # DO NOT include: emails, member IDs, credentials, tokens
        }
        safe_data["teams"].append(safe_team)
    
    return safe_data

def sync_metadata():
    """Copy and sanitize league metadata"""
    print("📊 Syncing league metadata...")
    src = PRIVATE_DATA_DIR / "league_metadata.json"
    
    if not src.exists():
        print(f"  ⚠️  {src} not found, skipping metadata sync")
        return False
    
    with open(src, encoding="utf-8") as f:
        data = json.load(f)
    
    safe_data = sanitize_metadata(data)
    
    # Write JSON
    dst_json = PUBLIC_REPO / "data" / "league_metadata.json"
    dst_json.parent.mkdir(exist_ok=True)
    with open(dst_json, "w", encoding="utf-8") as f:
        json.dump(safe_data, f, indent=2, ensure_ascii=False)
    print(f"  ✓ league_metadata.json")
    
    # Write JS version
    dst_js = PUBLIC_REPO / "data" / "league_metadata.js"
    with open(dst_js, "w", encoding="utf-8") as f:
        f.write("// Generated from league_metadata.json\n")
        f.write("window.LEAGUE_METADATA = ")
        json.dump(safe_data, f, indent=2, ensure_ascii=False)
        f.write(";\n")
    print(f"  ✓ league_metadata.js\n")
    return True

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
            bullet = line.strip().lstrip("- ").strip()
            if bullet:
                quick_hits.append(bullet)
    return quick_hits[:6]  # Top 6

def extract_capture_date(md_content):
    """Extract capture date from end of markdown"""
    match = re.search(r"_Data captured (\d{4}-\d{2}-\d{2} \d{2}:\d{2})", md_content)
    if match:
        try:
            dt = datetime.strptime(match.group(1), "%Y-%m-%d %H:%M")
            return dt.isoformat() + "Z"
        except:
            pass
    return None

def generate_recaps_index():
    """Generate recaps_index from markdown files"""
    print("📑 Generating recaps index...")
    recaps = []
    md_dir = PUBLIC_REPO / "md_recaps"
    
    for md_file in sorted(md_dir.glob("recap_week_*.md"), reverse=True):
        # Extract week number
        match = re.search(r"recap_week_(\d+)\.md", md_file.name)
        if not match:
            continue
        
        week_num = int(match.group(1))
        
        # Read markdown
        with open(md_file, encoding="utf-8") as f:
            content = f.read()
        
        quick_hits = extract_quick_hits(content)
        captured_at = extract_capture_date(content)
        
        recaps.append({
            "week": week_num,
            "captured_at": captured_at or "",
            "url": f"recaps/week-{week_num:02d}.html",
            "quick_hits": quick_hits
        })
    
    # Write JSON
    index_data = {"recaps": recaps}
    dst_json = PUBLIC_REPO / "data" / "recaps_index.json"
    with open(dst_json, "w", encoding="utf-8") as f:
        json.dump(index_data, f, indent=2, ensure_ascii=False)
    print(f"  ✓ recaps_index.json ({len(recaps)} recaps)")
    
    # Write JS version
    dst_js = PUBLIC_REPO / "data" / "recaps_index.js"
    with open(dst_js, "w", encoding="utf-8") as f:
        f.write("// Generated from recaps_index.json\n")
        f.write("window.RECAPS_INDEX = ")
        json.dump(index_data, f, indent=2, ensure_ascii=False)
        f.write(";\n")
    print(f"  ✓ recaps_index.js\n")
    return True

def run_public_scripts():
    """Run scripts in public repo to process data"""
    print("🔧 Running public repo scripts...")
    import subprocess
    
    scripts = [
        ("extract_standings.py", "Extracting standings/power rankings"),
        ("generate_week_htmls.py", "Generating HTML recap pages"),
        ("update_js_files.py", "Updating JS files")
    ]
    
    for script_name, description in scripts:
        script_path = PUBLIC_REPO / "scripts" / script_name
        if script_path.exists():
            print(f"  {description}...")
            try:
                result = subprocess.run(
                    ["python", str(script_path)],
                    cwd=str(PUBLIC_REPO),
                    capture_output=True,
                    text=True
                )
                if result.returncode == 0:
                    print(f"    ✓ {script_name}")
                else:
                    print(f"    ⚠️  {script_name} had errors:")
                    print(f"       {result.stderr}")
            except Exception as e:
                print(f"    ⚠️  Failed to run {script_name}: {e}")
        else:
            print(f"  ⚠️  {script_name} not found, skipping")
    
    print()

# ============================================================================
# MAIN
# ============================================================================

def main():
    print("🔄 Syncing outputs to public repo...\n")
    
    if not PUBLIC_REPO.exists():
        print(f"❌ Public repo not found at: {PUBLIC_REPO}")
        print("   Please update PUBLIC_REPO path in this script")
        return
    
    # Step 1: Copy markdown files
    has_markdown = sync_markdown()
    
    # Step 2: Sync metadata
    sync_metadata()
    
    # Step 3: Generate recaps index
    if has_markdown:
        generate_recaps_index()
    
    # Step 4: Run public repo scripts
    if has_markdown:
        run_public_scripts()
    
    print("✅ Sync complete!")
    print("\n📋 Next steps:")
    print("  1. Review changes in public repo")
    print("  2. Verify no secrets/credentials were synced")
    print("  3. Commit and push to GitHub")
    print(f"     cd {PUBLIC_REPO}")
    print("     git add .")
    print("     git commit -m 'Update week X recap'")
    print("     git push")

if __name__ == "__main__":
    main()

