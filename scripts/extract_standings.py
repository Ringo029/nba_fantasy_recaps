#!/usr/bin/env python3
"""
Extract standings and power rankings from the latest week's markdown recap.
"""
import json
import re
from pathlib import Path

REPO_ROOT = Path(__file__).parent.parent
MD_DIR = REPO_ROOT / "md_recaps"
DATA_DIR = REPO_ROOT / "data"

def parse_standings_table(md_content):
    """Parse standings table from markdown"""
    standings = {}
    in_standings = False
    for line in md_content.split("\n"):
        if "## 🏆 League Standings" in line:
            in_standings = True
            continue
        if in_standings and line.startswith("##"):
            break
        if in_standings and "```" in line:
            continue
        if in_standings and line.strip() and not line.strip().startswith("standing_rank"):
            # Parse line like: "             1               Los Suns de PFKNR   8-0-0 (1.0)"
            parts = line.split()
            if len(parts) >= 3:
                try:
                    rank = int(parts[0].strip())
                    # Team name might have spaces, find where record starts (looks like "8-0-0")
                    record_idx = None
                    for i, part in enumerate(parts):
                        if re.match(r'\d+-\d+-\d+', part):
                            record_idx = i
                            break
                    if record_idx:
                        team_name = " ".join(parts[1:record_idx])
                        record = " ".join(parts[record_idx:record_idx+2]) if record_idx + 1 < len(parts) else parts[record_idx]
                        standings[team_name] = {
                            "standing_rank": rank,
                            "record": record
                        }
                except (ValueError, IndexError):
                    continue
    return standings

def parse_power_rankings(md_content):
    """Parse power rankings table from markdown"""
    power_rankings = {}
    in_power = False
    for line in md_content.split("\n"):
        if "## 💪 Weekly Power Ranking" in line:
            in_power = True
            continue
        if in_power and line.startswith("##"):
            break
        if in_power and "```" in line:
            continue
        if in_power and line.strip() and not line.strip().startswith("power_rank"):
            # Parse line like: "          1                El TumbaCuello 🏆        526.0     0.881495     ^ +2"
            parts = line.split()
            if len(parts) >= 4:
                try:
                    power_rank = int(parts[0].strip())
                    # Find movement indicator (^ or v)
                    movement = None
                    movement_idx = None
                    for i, part in enumerate(parts):
                        if part in ["^", "v"]:
                            movement_idx = i
                            movement = part
                            break
                    if movement_idx and movement_idx + 1 < len(parts):
                        movement_text = f"{movement} {parts[movement_idx + 1]}"
                    elif movement:
                        movement_text = movement
                    else:
                        movement_text = "—"
                    
                    # Team name is between power_rank and the first number (week_points)
                    # Find first number after team name
                    num_idx = None
                    for i in range(1, len(parts)):
                        try:
                            float(parts[i])
                            num_idx = i
                            break
                        except ValueError:
                            continue
                    
                    if num_idx:
                        team_name = " ".join(parts[1:num_idx])
                        power_rankings[team_name] = {
                            "power_rank": power_rank,
                            "movement": movement_text
                        }
                except (ValueError, IndexError):
                    continue
    return power_rankings

def main():
    # Find latest week
    md_files = sorted(MD_DIR.glob("recap_week_*.md"), reverse=True)
    if not md_files:
        print("No markdown files found")
        return
    
    latest_md = md_files[0]
    print(f"Processing {latest_md.name}...")
    
    with open(latest_md, encoding="utf-8") as f:
        md_content = f.read()
    
    standings = parse_standings_table(md_content)
    power_rankings = parse_power_rankings(md_content)
    
    # Load existing metadata
    with open(DATA_DIR / "league_metadata.json", encoding="utf-8") as f:
        metadata = json.load(f)
    
    def normalize_team_name(name):
        """Normalize team name for matching (remove extra spaces, trailing spaces)"""
        if not name:
            return ""
        # Replace multiple spaces with single space, strip trailing/leading
        normalized = " ".join(name.split())
        return normalized
    
    # Normalize all team names for matching
    normalized_standings = {normalize_team_name(k): v for k, v in standings.items()}
    normalized_power = {normalize_team_name(k): v for k, v in power_rankings.items()}
    
    # Track which teams were matched
    matched_standings = set()
    matched_power = set()
    
    # Update teams with standings and power rankings
    for team in metadata.get("teams", []):
        team_name = team.get("team_name", "")
        normalized_team = normalize_team_name(team_name)
        
        # Try exact match first
        if normalized_team in normalized_standings:
            team["standing_rank"] = normalized_standings[normalized_team]["standing_rank"]
            team["record"] = normalized_standings[normalized_team]["record"]
            matched_standings.add(normalized_team)
        else:
            # Try fuzzy matching - find closest match
            best_match = None
            for md_name in normalized_standings.keys():
                # Check if one contains the other (handles partial matches)
                if normalized_team in md_name or md_name in normalized_team:
                    best_match = md_name
                    break
            if best_match:
                team["standing_rank"] = normalized_standings[best_match]["standing_rank"]
                team["record"] = normalized_standings[best_match]["record"]
                matched_standings.add(best_match)
                print(f"  Matched '{team_name}' to '{best_match}' (standings)")
        
        # Same for power rankings
        if normalized_team in normalized_power:
            team["power_rank"] = normalized_power[normalized_team]["power_rank"]
            team["power_movement"] = normalized_power[normalized_team]["movement"]
            matched_power.add(normalized_team)
        else:
            # Try fuzzy matching
            best_match = None
            for md_name in normalized_power.keys():
                if normalized_team in md_name or md_name in normalized_team:
                    best_match = md_name
                    break
            if best_match:
                team["power_rank"] = normalized_power[best_match]["power_rank"]
                team["power_movement"] = normalized_power[best_match]["movement"]
                matched_power.add(best_match)
                print(f"  Matched '{team_name}' to '{best_match}' (power rankings)")
    
    # Report unmatched teams
    unmatched_standings = set(normalized_standings.keys()) - matched_standings
    unmatched_power = set(normalized_power.keys()) - matched_power
    
    if unmatched_standings:
        print(f"\n⚠️  Unmatched standings teams: {unmatched_standings}")
    if unmatched_power:
        print(f"⚠️  Unmatched power ranking teams: {unmatched_power}")
    
    # Save updated metadata
    with open(DATA_DIR / "league_metadata.json", "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)
    
    # Update JS file
    with open(DATA_DIR / "league_metadata.js", "w", encoding="utf-8") as f:
        f.write("// Generated from league_metadata.json\n")
        f.write("window.LEAGUE_METADATA = ")
        json.dump(metadata, f, indent=2, ensure_ascii=False)
        f.write(";\n")
    
    print(f"Updated {len(standings)} teams with standings")
    print(f"Updated {len(power_rankings)} teams with power rankings")

if __name__ == "__main__":
    main()

