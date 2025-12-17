function safeText(s) {
  // Prevent accidental HTML injection if metadata contains weird values
  return String(s ?? "").replace(/[<>&"]/g, (c) => (
    c === "<" ? "&lt;" :
    c === ">" ? "&gt;" :
    c === "&" ? "&amp;" : "&quot;"
  ));
}

function formatQuickHit(hit) {
  // Remove markdown bold markers and format nicely
  let text = hit.replace(/\*\*/g, "").trim();
  
  // Split on colon if present
  if (text.includes(":")) {
    const [label, ...valueParts] = text.split(":");
    const value = valueParts.join(":").trim();
    return {
      label: label.trim(),
      value: value
    };
  }
  
  // If no colon, return as is
  return {
    label: "",
    value: text
  };
}

function renderLeagueHeader(meta) {
  const el = document.getElementById("leagueLine");
  const name = safeText(meta.league_name || "League");
  const season = safeText(meta.season || "");
  const scoring = safeText(meta.scoring_type || "");
  el.innerHTML = `${name} • Season ${season} • ${scoring}`;
}

function renderTeams(meta) {
  const root = document.getElementById("teamsList");
  root.innerHTML = "";

  // Sort by standing rank (if available), otherwise by team name
  const teams = (meta.teams || []).slice().sort((a, b) => {
    const rankA = a.standing_rank ?? 999;
    const rankB = b.standing_rank ?? 999;
    if (rankA !== rankB) return rankA - rankB;
    return (a.team_name || "").localeCompare(b.team_name || "");
  });

  teams.forEach(t => {
    const div = document.createElement("div");
    div.className = "team";
    
    // Make team card clickable to open team insights
    div.addEventListener("click", () => {
      const teamName = encodeURIComponent(t.team_name || "");
      window.location.href = `team_insights.html?team=${teamName}`;
    });
    div.title = `Click to view insights for ${t.team_name || "team"}`;

    const img = document.createElement("img");
    img.alt = `${t.team_name || "Team"} logo`;
    img.src = t.logo_url || "";
    img.loading = "lazy";
    img.referrerPolicy = "no-referrer";
    img.onerror = () => { img.style.display = "none"; };

    const info = document.createElement("div");
    info.style.flex = "1";
    
    // Build team info with rank and movement
    let teamInfo = `<div class="tname">${safeText(t.team_name)}</div>`;
    
    // Add standing rank and record if available
    if (t.standing_rank !== undefined) {
      teamInfo += `<div class="team-meta">#${t.standing_rank} ${t.record ? safeText(t.record) : ""}</div>`;
    }
    
    // Add power ranking movement if available
    if (t.power_movement && t.power_movement !== "—") {
      const movementClass = t.power_movement.startsWith("^") ? "movement-up" : "movement-down";
      teamInfo += `<div class="power-movement ${movementClass}">${safeText(t.power_movement)}</div>`;
    }
    
    info.innerHTML = teamInfo;

    if (t.logo_url) div.appendChild(img);
    div.appendChild(info);
    root.appendChild(div);
  });
}

let allRecaps = [];
let currentWeek = null;

function extractQuickHitValue(quickHits, patterns) {
  // patterns can be a string or array of strings to match
  const patternList = Array.isArray(patterns) ? patterns : [patterns];
  
  for (const hit of quickHits || []) {
    for (const pattern of patternList) {
      if (hit.includes(pattern)) {
        // Remove markdown bold markers and the pattern, then trim
        let result = hit.replace(/\*\*/g, "").trim();
        // Find the pattern and extract everything after it
        const patternIndex = result.indexOf(pattern);
        if (patternIndex !== -1) {
          result = result.substring(patternIndex + pattern.length).trim();
          // Remove leading colon if present
          if (result.startsWith(":")) {
            result = result.substring(1).trim();
          }
          return result;
        }
      }
    }
  }
  return "—";
}

function renderHeroSummary(recap) {
  if (!recap) {
    document.getElementById("hero-week").textContent = "—";
    document.getElementById("stat-top-team").textContent = "—";
    document.getElementById("stat-mvp").textContent = "—";
    document.getElementById("stat-beatdown").textContent = "—";
    document.getElementById("stat-closest").textContent = "—";
    return;
  }

  document.getElementById("hero-week").textContent = String(recap.week).padStart(2, "0");
  
  const quickHits = recap.quick_hits || [];
  document.getElementById("stat-top-team").textContent = extractQuickHitValue(quickHits, ["Team of the Week:", "Team of the Week"]);
  document.getElementById("stat-mvp").textContent = extractQuickHitValue(quickHits, ["Weekly MVP:", "MVP:"]);
  document.getElementById("stat-beatdown").textContent = extractQuickHitValue(quickHits, ["Biggest Beatdown:", "Beatdown:"]);
  document.getElementById("stat-closest").textContent = extractQuickHitValue(quickHits, ["Closest Matchup:", "Closest:"]);
  
  // Update view full recap link
  const viewLink = document.getElementById("view-full-recap");
  if (viewLink) {
    viewLink.href = recap.url;
  }
}

function renderWeekNav(recaps) {
  const weekSelect = document.getElementById("week-select");
  if (!weekSelect) return;

  weekSelect.innerHTML = "";
  const sortedWeeks = recaps.slice().sort((a, b) => (b.week ?? 0) - (a.week ?? 0));
  
  sortedWeeks.forEach(r => {
    const option = document.createElement("option");
    option.value = r.week;
    option.textContent = `Week ${String(r.week).padStart(2, "0")}`;
    weekSelect.appendChild(option);
  });

  // Set current week to latest
  if (sortedWeeks.length > 0) {
    currentWeek = sortedWeeks[0].week;
    weekSelect.value = currentWeek;
    renderHeroSummary(sortedWeeks[0]);
    updateNavButtons();
  }

  // Week selector change
  weekSelect.addEventListener("change", (e) => {
    const week = parseInt(e.target.value);
    const recap = recaps.find(r => r.week === week);
    if (recap) {
      currentWeek = week;
      renderHeroSummary(recap);
      updateNavButtons();
    }
  });

  // Prev/Next buttons
  const prevBtn = document.getElementById("prev-week");
  const nextBtn = document.getElementById("next-week");
  
  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      const currentIndex = sortedWeeks.findIndex(r => r.week === currentWeek);
      if (currentIndex < sortedWeeks.length - 1) {
        const prevRecap = sortedWeeks[currentIndex + 1];
        currentWeek = prevRecap.week;
        weekSelect.value = currentWeek;
        renderHeroSummary(prevRecap);
        updateNavButtons();
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      const currentIndex = sortedWeeks.findIndex(r => r.week === currentWeek);
      if (currentIndex > 0) {
        const nextRecap = sortedWeeks[currentIndex - 1];
        currentWeek = nextRecap.week;
        weekSelect.value = currentWeek;
        renderHeroSummary(nextRecap);
        updateNavButtons();
      }
    });
  }
}

function updateNavButtons() {
  const sortedWeeks = allRecaps.slice().sort((a, b) => (b.week ?? 0) - (a.week ?? 0));
  const currentIndex = sortedWeeks.findIndex(r => r.week === currentWeek);
  
  const prevBtn = document.getElementById("prev-week");
  const nextBtn = document.getElementById("next-week");
  
  if (prevBtn) {
    prevBtn.disabled = currentIndex >= sortedWeeks.length - 1;
  }
  if (nextBtn) {
    nextBtn.disabled = currentIndex <= 0;
  }
}

function renderRecaps(index) {
  const root = document.getElementById("recapsList");
  root.innerHTML = "";

  allRecaps = index.recaps || [];
  const items = allRecaps.slice().sort((a,b) => (b.week ?? 0) - (a.week ?? 0));

  items.forEach(r => {
    const card = document.createElement("div");
    card.className = "recap-item";

    const title = `Week ${String(r.week).padStart(2, "0")} Recap`;
    const date = r.captured_at ? new Date(r.captured_at).toLocaleString() : "";

    card.innerHTML = `
      <div class="top">
        <div>
          <div class="title">${safeText(title)}</div>
          <div class="meta">${safeText(date)}</div>
        </div>
        <div><a href="${safeText(r.url)}">Open →</a></div>
      </div>
      <ul class="quickhits">
        ${(r.quick_hits || []).slice(0, 6).map(h => {
          const formatted = formatQuickHit(h);
          if (formatted.label) {
            return `<li><span class="quickhit-label">${safeText(formatted.label)}:</span> <span class="quickhit-value">${safeText(formatted.value)}</span></li>`;
          } else {
            return `<li>${safeText(formatted.value)}</li>`;
          }
        }).join("")}
      </ul>
    `;

    root.appendChild(card);
  });
}


(async function init() {
  try {
    const meta = window.LEAGUE_METADATA || {};
    const recapsIndex = window.RECAPS_INDEX || {};

    renderLeagueHeader(meta);
    renderTeams(meta);
    renderRecaps(recapsIndex);
    renderWeekNav(recapsIndex.recaps || []);
  } catch (err) {
    console.error(err);
    document.getElementById("leagueLine").textContent = "Failed to load site data.";
  }
})();


