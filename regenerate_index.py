#!/usr/bin/env python3
"""Regenerate recaps_index.json from markdown files"""
import json
import re
from pathlib import Path
from datetime import datetime

REPO_ROOT = Path(__file__).parent
MD_DIR = REPO_ROOT / "md_recaps"
DATA_DIR = REPO_ROOT / "data"

def extract_quick_hits(md_content):
    """Extract quick hits from Storylines sections"""
    quick_hits = []
    in_storylines = False
    
    for line in md_content.split("\n"):
        if line.startswith("## 📖 Storylines") or line.startswith("## 📰 Weekly Storylines"):
            in_storylines = True
            continue
        
        if in_storylines and line.startswith("##"):
            break
        
        if in_storylines:
            stripped = line.strip()
            if stripped.startswith("- **"):
                bullet = stripped.lstrip("- ").strip()
                if bullet:
                    quick_hits.append(bullet)
            elif stripped.startswith("• **"):
                bullet = stripped.lstrip("• ").strip()
                if bullet:
                    quick_hits.append(bullet)
    
    return quick_hits[:6]

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

def main():
    recaps = []
    
    for md_file in sorted(MD_DIR.glob("recap_week_*.md"), reverse=True):
        try:
            match = re.search(r"recap_week_(\d+)\.md", md_file.name)
            if not match:
                continue
            
            week_num = int(match.group(1))
            
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
        except Exception as e:
            print(f"Error processing {md_file.name}: {e}")
            continue
    
    # Sort recaps by week number (descending - newest first)
    recaps.sort(key=lambda x: x["week"], reverse=True)
    
    index_data = {"recaps": recaps}
    dst_json = DATA_DIR / "recaps_index.json"
    with open(dst_json, "w", encoding="utf-8") as f:
        json.dump(index_data, f, indent=2, ensure_ascii=False)
    print(f"Generated recaps_index.json with {len(recaps)} recaps")
    
    # Also generate JS version
    dst_js = DATA_DIR / "recaps_index.js"
    with open(dst_js, "w", encoding="utf-8") as f:
        f.write("// Generated from recaps_index.json\n")
        f.write("window.RECAPS_INDEX = ")
        json.dump(index_data, f, indent=2, ensure_ascii=False)
        f.write(";\n")
    print(f"Generated recaps_index.js")

if __name__ == "__main__":
    main()
