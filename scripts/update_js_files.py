#!/usr/bin/env python3
"""
Helper script to regenerate .js files from .json files.
Run this after updating JSON files to keep JS files in sync.
"""
import json
from pathlib import Path

REPO_ROOT = Path(__file__).parent.parent
DATA_DIR = REPO_ROOT / "data"

def json_to_js(json_path, js_var_name):
    """Convert JSON file to JS file with window variable"""
    js_path = json_path.with_suffix(".js")
    
    with open(json_path, encoding="utf-8") as f:
        data = json.load(f)
    
    with open(js_path, "w", encoding="utf-8") as f:
        f.write(f"// Generated from {json_path.name}\n")
        f.write(f"window.{js_var_name} = ")
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write(";\n")
    
    print(f"Generated {js_path.name}")

if __name__ == "__main__":
    print("Updating JS files from JSON...\n")
    
    json_to_js(DATA_DIR / "league_metadata.json", "LEAGUE_METADATA")
    json_to_js(DATA_DIR / "recaps_index.json", "RECAPS_INDEX")
    
    print("\nDone!")

