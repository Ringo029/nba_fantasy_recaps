(function () {
  const TEAM_KEY = "fb_my_team_id";
  const statusLine = document.getElementById("period-line");
  const updatedLine = document.getElementById("updated-line");
  const staleWarning = document.getElementById("stale-warning");
  const hubWarning = document.getElementById("hub-warning");
  const cards = document.getElementById("matchup-cards");
  const seasonSelect = document.getElementById("season-select");
  const shareLink = document.getElementById("whatsapp-share");
  const myTeamLink = document.getElementById("my-team-link");
  const teamsNote = document.getElementById("teams-note");
  const fixturePanel = document.getElementById("fixture-panel");
  const fixtureCount = document.getElementById("fixture-count");
  const fixtureNote = document.getElementById("fixture-note");

  function text(value) {
    return String(value ?? "");
  }

  function clear(node) {
    while (node && node.firstChild) node.removeChild(node.firstChild);
  }

  function paragraph(parent, className, value) {
    const el = document.createElement("p");
    if (className) el.className = className;
    el.textContent = value;
    parent.appendChild(el);
    return el;
  }

  function displayMetric(value) {
    if (value === null || value === undefined || value === "") return "Unavailable";
    return String(value);
  }

  function savedTeamId() {
    try {
      return localStorage.getItem(TEAM_KEY) || "";
    } catch (err) {
      return "";
    }
  }

  function applySavedTeam(seasonId) {
    const id = savedTeamId();
    if (!myTeamLink) return;
    if (seasonId && id) {
      myTeamLink.href = `team_insights.html?season=${encodeURIComponent(seasonId)}&team_id=${encodeURIComponent(id)}`;
      return;
    }
    myTeamLink.href = id ? `team_insights.html?team_id=${encodeURIComponent(id)}` : "team_insights.html";
  }

  function formatUpdated(iso, timezone) {
    const zone = timezone || "America/New_York";
    if (!iso) return `No capture time has been published. League timezone: ${zone}.`;
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return `The published timestamp could not be read. League timezone: ${zone}.`;
    try {
      const clock = new Intl.DateTimeFormat("en-US", {
        timeZone: zone,
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: "short",
      }).format(date);
      return `Captured ${clock}. League timezone: ${zone}.`;
    } catch (err) {
      return `Captured ${iso}. League timezone: ${zone}.`;
    }
  }

  function showStale(hub) {
    if (!staleWarning) return;
    const hours = Number(hub.stale_after_hours || 6);
    const messages = [];
    if (hub.data_mode && hub.data_mode !== "live") {
      messages.push("This publication is not a live snapshot.");
    }
    if (!hub.generated_at) {
      messages.push("Live data has not been published. Choose 2025–26 to open the archived recaps.");
    } else {
      const age = Date.now() - new Date(hub.generated_at).getTime();
      if (Number.isNaN(age) || age > hours * 60 * 60 * 1000) {
        messages.push(`This capture is older than ${hours} hours. A newer publication has not replaced it.`);
      }
    }
    staleWarning.hidden = messages.length === 0;
    staleWarning.textContent = messages.join(" ");
  }

  function matchupSide(directory, teamId, name, score) {
    const side = document.createElement("div");
    side.className = "matchup-side";
    const profile = FantasyDirectory.profileFor(directory, teamId);
    side.appendChild(FantasyDirectory.logoElement(profile.logo_url, name || "Team"));
    const label = document.createElement("span");
    label.textContent = `${name || "Team"} ${displayMetric(score)}`;
    side.appendChild(label);
    return side;
  }

  function renderMatchups(progress, directory) {
    clear(cards);
    const rows = progress && Array.isArray(progress.matchups) ? progress.matchups : [];
    if (!rows.length) {
      paragraph(cards, "empty-state", "Matchup scores are unavailable.");
      return;
    }
    rows.forEach((row) => {
      const card = document.createElement("article");
      card.className = "card matchup-card";
      const title = document.createElement("h3");
      title.append(
        matchupSide(directory, row.home_team_id, row.home_team_name, row.home_score),
        matchupSide(directory, row.away_team_id, row.away_team_name, row.away_score)
      );
      card.appendChild(title);
      const remainingMissing = row.home_games_remaining == null && row.away_games_remaining == null;
      paragraph(
        card,
        "footer",
        remainingMissing
          ? "Per-team games remaining: Unavailable"
          : `Per-team games remaining: ${displayMetric(row.home_games_remaining)} / ${displayMetric(row.away_games_remaining)}`
      );
      const projectionsHidden = row.projection_basis === "unavailable"
        || (row.home_projected_finish == null && row.away_projected_finish == null);
      if (!projectionsHidden) {
        paragraph(
          card,
          "footer",
          `Projected finish: ${displayMetric(row.home_projected_finish)} – ${displayMetric(row.away_projected_finish)}`
        );
      }
      cards.appendChild(card);
    });
  }

  function renderFixtures(fixtures) {
    if (!fixturePanel || !fixtureCount || !fixtureNote) return;
    fixturePanel.hidden = false;
    if (!fixtures || fixtures.available === false || !fixtures.counts) {
      fixtureCount.textContent = "Scheduled future games: Unavailable";
      fixtureNote.textContent = fixtures && fixtures.reason
        ? fixtures.reason
        : "Game status is unavailable, so an exact remaining-game count is not shown.";
      return;
    }
    const future = fixtures.counts.scheduled_future_tipoffs;
    fixtureCount.textContent = `Scheduled future games: ${displayMetric(future)}`;
    fixtureNote.textContent = "Game status is unavailable, so this is not an exact remaining-game count. Games whose tipoff has already passed are not labeled completed. This is ESPN's fantasy scoring schedule, and completeness against the NBA official schedule is not verified.";
  }

  function renderLiveStandings(doc, seasonId, directory) {
    const root = document.getElementById("teamsList");
    const teamsSection = document.getElementById("teams-section");
    const teamsJump = document.getElementById("teams-jump");
    if (!root || !doc || !Array.isArray(doc.standings)) return;
    if (directory && directory.seasonId && directory.seasonId !== seasonId) return;
    if (teamsSection) teamsSection.hidden = false;
    if (teamsJump) teamsJump.hidden = false;
    clear(root);
    doc.standings.forEach((row) => {
      const div = document.createElement("div");
      div.className = "team";
      const link = document.createElement("a");
      link.className = "team-link";
      link.href = `team_insights.html?season=${encodeURIComponent(seasonId)}&team_id=${encodeURIComponent(row.team_id)}`;
      const profile = FantasyDirectory.profileFor(directory, row.team_id);
      link.appendChild(FantasyDirectory.logoElement(profile.logo_url, row.team_name || "Team"));
      const info = document.createElement("div");
      const name = document.createElement("div");
      name.className = "tname";
      name.textContent = row.team_name;
      const meta = document.createElement("div");
      meta.className = "team-meta";
      meta.textContent = `#${displayMetric(row.rank)} ${displayMetric(row.wins)}-${displayMetric(row.losses)}-${displayMetric(row.ties)}. Power rank: ${displayMetric(row.power_rank)}.`;
      info.append(name, meta);
      const movement = FantasyDirectory.movementText(row.power_movement);
      if (movement) {
        const movementEl = document.createElement("div");
        movementEl.className = FantasyDirectory.movementClass(row.power_movement);
        movementEl.textContent = movement;
        info.appendChild(movementEl);
      }
      link.appendChild(info);
      div.appendChild(link);
      root.appendChild(div);
    });
    if (teamsNote) {
      teamsNote.textContent = "Standings from this capture. Power rank is unavailable when no power score was published. Null values stay Unavailable.";
    }
  }

  function renderArchiveDirectory(doc) {
    const root = document.getElementById("teamsList");
    const teamsSection = document.getElementById("teams-section");
    const teamsJump = document.getElementById("teams-jump");
    if (!root) return;
    if (teamsSection) teamsSection.hidden = false;
    if (teamsJump) teamsJump.hidden = false;
    clear(root);
    const teams = (doc && doc.teams ? doc.teams : []).slice().sort((a, b) => {
      const left = Number(a.standing_rank);
      const right = Number(b.standing_rank);
      if (Number.isNaN(left) || Number.isNaN(right)) return 0;
      return left - right;
    });
    teams.forEach((row) => {
      const div = document.createElement("div");
      div.className = "team";
      const info = document.createElement("div");
      const name = document.createElement("div");
      name.className = "tname";
      name.textContent = row.team_name || "Unavailable";
      const meta = document.createElement("div");
      meta.className = "team-meta";
      meta.textContent = `#${displayMetric(row.standing_rank)} ${displayMetric(row.record)}. Power rank: ${displayMetric(row.power_rank)} ${displayMetric(row.power_movement)}.`;
      info.append(name, meta);
      div.appendChild(info);
      root.appendChild(div);
    });
    if (teamsNote) {
      teamsNote.textContent = "Last published team directory for 2025–26. It is not a standings snapshot for one recap.";
    }
  }

  function renderArchive(index, seasonId) {
    const root = document.getElementById("recapsList");
    if (!root || !index) return;
    clear(root);
    const rows = (index.recaps || []).slice().sort((a, b) => (b.period_id || b.week || 0) - (a.period_id || a.week || 0));
    if (!rows.length) {
      paragraph(root, "empty-state", "No recaps are published for this season.");
      return;
    }
    rows.forEach((row) => {
      const card = document.createElement("div");
      card.className = "recap-item";
      const top = document.createElement("div");
      top.className = "top";
      const title = document.createElement("div");
      title.className = "title";
      const periodLabel = `${seasonId} matchup ${String(row.period_id || row.week).padStart(2, "0")}`;
      const provisional = row.status !== "final";
      title.textContent = provisional ? `${periodLabel} · Matchup progress` : `${periodLabel} · Finalized recap`;
      const link = document.createElement("a");
      link.href = row.url || "#";
      link.textContent = provisional ? "Matchup progress" : "Finalized recap";
      top.appendChild(title);
      top.appendChild(link);
      card.appendChild(top);
      if (row.note) paragraph(card, "footer", row.note);
      root.appendChild(card);
    });
  }

  async function loadJson(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(url);
    return response.json();
  }

  function quickHit(recap, patterns) {
    const hits = recap.archived_quick_hits || recap.quick_hits || [];
    for (const hit of hits) {
      const plain = String(hit).replace(/\*\*/g, "");
      for (const pattern of patterns) {
        const index = plain.indexOf(pattern);
        if (index !== -1) {
          return plain.slice(index + pattern.length).replace(/^:\s*/, "").trim();
        }
      }
    }
    return "";
  }

  function awardValue(recap, key, patterns) {
    const awards = recap && recap.awards;
    if (awards && awards[key]) return String(awards[key]);
    return recap ? quickHit(recap, patterns) : "";
  }

  function setStat(rowId, valueId, value) {
    const row = document.getElementById(rowId);
    const valueNode = document.getElementById(valueId);
    if (row) row.hidden = !value;
    if (valueNode && value) valueNode.textContent = value;
  }

  function renderCompletedRecap(recap, seasonId) {
    const hero = document.getElementById("hero-summary");
    const source = document.getElementById("hero-source");
    const viewLink = document.getElementById("view-full-recap");
    if (!recap) {
      if (hero) hero.hidden = true;
      return;
    }
    if (hero) hero.hidden = false;
    const period = recap.period_id || recap.week;
    const weekNode = document.getElementById("hero-week");
    if (weekNode) weekNode.textContent = String(period).padStart(2, "0");
    setStat("stat-top-row", "stat-top-team", awardValue(recap, "team_of_period", ["Team of the Week"]));
    setStat("stat-mvp-row", "stat-mvp", awardValue(recap, "mvp", ["Weekly MVP", "MVP"]));
    setStat("stat-beat-row", "stat-beatdown", awardValue(recap, "widest_margin", ["Biggest Beatdown", "Biggest win"]));
    setStat("stat-close-row", "stat-closest", awardValue(recap, "closest_matchup", ["Closest Matchup", "Closest"]));
    if (viewLink) viewLink.href = recap.url || "#";
    if (source) {
      source.textContent = `${seasonId} matchup ${String(period).padStart(2, "0")} is the selected finalized recap. Current standings stay on the latest capture.`;
    }
  }

  function bindRecapPicker(finals, seasonId) {
    const select = document.getElementById("week-select");
    const prev = document.getElementById("prev-week");
    const next = document.getElementById("next-week");
    if (!select) return;
    const ordered = finals.slice().sort((a, b) => (b.period_id || b.week || 0) - (a.period_id || a.week || 0));
    select.textContent = "";
    ordered.forEach((recap) => {
      const option = document.createElement("option");
      const period = recap.period_id || recap.week;
      option.value = String(period);
      option.textContent = `Matchup ${String(period).padStart(2, "0")}`;
      select.appendChild(option);
    });
    const show = (period) => {
      const recap = ordered.find((row) => String(row.period_id || row.week) === String(period));
      if (recap) renderCompletedRecap(recap, seasonId);
      const index = ordered.findIndex((row) => String(row.period_id || row.week) === String(period));
      if (prev) prev.disabled = index >= ordered.length - 1;
      if (next) next.disabled = index <= 0;
    };
    select.onchange = () => show(select.value);
    if (prev) {
      prev.onclick = () => {
        const index = ordered.findIndex((row) => String(row.period_id || row.week) === select.value);
        if (index < ordered.length - 1) {
          select.value = String(ordered[index + 1].period_id || ordered[index + 1].week);
          show(select.value);
        }
      };
    }
    if (next) {
      next.onclick = () => {
        const index = ordered.findIndex((row) => String(row.period_id || row.week) === select.value);
        if (index > 0) {
          select.value = String(ordered[index - 1].period_id || ordered[index - 1].week);
          show(select.value);
        }
      };
    }
    if (ordered.length) show(ordered[0].period_id || ordered[0].week);
    else renderCompletedRecap(null, seasonId);
  }

  let seasonRequest = 0;

  async function selectSeason(season, hub) {
    const requestId = ++seasonRequest;
    const teamsRoot = document.getElementById("teamsList");
    if (teamsRoot) clear(teamsRoot);
    const liveSeason = hub && hub.season_id;
    const live = season.season_id === liveSeason && hub.status !== "unavailable" && hub.matchup_period_id;
    if (statusLine) {
      if (live) {
        statusLine.textContent = `Matchup ${hub.matchup_period_id}: ${hub.period_start || "Unavailable"} to ${hub.period_end || "Unavailable"}. Status: ${hub.status}.`;
      } else if (season.archive) {
        statusLine.textContent = `${season.label} is an archive. It does not use the current matchup.`;
      } else {
        statusLine.textContent = "This season does not have a published matchup period yet.";
      }
    }
    const teamsSection = document.getElementById("teams-section");
    const teamsJump = document.getElementById("teams-jump");
    const leagueLine = document.getElementById("leagueLine");
    const standingsHeading = document.getElementById("standings-heading");
    const standingsSub = document.getElementById("standings-sub");
    const matchupHeading = document.getElementById("matchup-heading");
    const showArchivePanels = Boolean(season.archive);
    if (matchupHeading) {
      matchupHeading.textContent = live ? "Current matchup progress" : "Current matchup stays with the live season";
    }
    if (standingsHeading) {
      standingsHeading.textContent = showArchivePanels ? `${season.label} team directory` : "Current standings";
    }
    if (standingsSub) {
      standingsSub.textContent = showArchivePanels
        ? "Last published team directory for this archive. It is not a standings snapshot for one recap."
        : "From the latest capture. Choosing a recap does not change this table.";
    }
    if (leagueLine) {
      leagueLine.dataset.managed = "hub";
      leagueLine.textContent = showArchivePanels
        ? `THE LEAGUE • ${season.label || season.season_id} archive`
        : "THE LEAGUE • 2026–27";
    }
    applySavedTeam(live ? season.season_id : "");
    if (!live) {
      if (fixturePanel) fixturePanel.hidden = true;
      if (teamsSection) teamsSection.hidden = !showArchivePanels;
      if (teamsJump) teamsJump.hidden = !showArchivePanels;
      if (teamsNote) {
        teamsNote.textContent = showArchivePanels
          ? "Last published team directory for 2025–26. It is not a standings snapshot for an individual archived week."
          : "A team directory for this season has not been published. The 2025–26 list is hidden so it is not read as this season's standings.";
      }
    }
    let directory = FantasyDirectory.indexByTeamId([], season.season_id);
    try {
      if (live) {
        const sources = FantasyDirectory.dataSources(season.season_id);
        const [progress, teamsDoc] = await Promise.all([
          loadJson(`data/seasons/${season.season_id}/weeks/${hub.matchup_period_id}/matchup_progress.json`),
          sources.teams ? loadJson(sources.teams) : Promise.resolve({ teams: [] }),
        ]);
        const accepted = FantasyDirectory.acceptDirectory(
          requestId,
          seasonRequest,
          FantasyDirectory.indexByTeamId(teamsDoc.teams || [], season.season_id)
        );
        if (!accepted) return;
        directory = accepted;
        renderMatchups(progress, directory);
      } else {
        renderMatchups(null, directory);
      }
    } catch (err) {
      if (requestId !== seasonRequest) return;
      renderMatchups(null, directory);
    }
    if (requestId !== seasonRequest) return;
    if (live) {
      try {
        renderFixtures(await loadJson(`data/seasons/${season.season_id}/weeks/${hub.matchup_period_id}/fixtures.json`));
      } catch (err) {
        renderFixtures(null);
      }
      if (requestId !== seasonRequest) return;
      try {
        const standingsDoc = await loadJson(FantasyDirectory.dataSources(season.season_id).standings);
        if (requestId !== seasonRequest) return;
        renderLiveStandings(standingsDoc, season.season_id, directory);
      } catch (err) {
        if (teamsNote) teamsNote.textContent = "Standings are unavailable for this capture.";
      }
    } else if (showArchivePanels) {
      try {
        renderArchiveDirectory(await loadJson("data/league_metadata.json"));
      } catch (err) {
        const root = document.getElementById("teamsList");
        if (root) {
          clear(root);
          paragraph(root, "empty-state", "The archived team directory is unavailable.");
        }
      }
    } else {
      const root = document.getElementById("teamsList");
      if (root) clear(root);
    }
    try {
      const index = await loadJson(season.recap_index);
      renderArchive(index, season.season_id);
      const finals = (index.recaps || []).filter((row) => row.status === "final");
      bindRecapPicker(finals, season.season_id);
    } catch (err) {
      const root = document.getElementById("recapsList");
      if (root) {
        clear(root);
        paragraph(root, "empty-state", "The recap index for this season is not available.");
      }
      renderCompletedRecap(null, season.season_id);
    }
  }

  async function init() {
    try {
    applySavedTeam("");
    if (statusLine) statusLine.textContent = "Loading hub data…";
    let hub = { status: "unavailable", warnings: ["Hub data could not be loaded."], stale_after_hours: 6, timezone: "America/New_York" };
    let seasons = [];
    try {
      hub = await loadJson("data/hub/current.json");
    } catch (err) {
      hub.warnings = ["data/hub/current.json is not available."];
    }
    try {
      const index = await loadJson("data/seasons/index.json");
      seasons = index.seasons || [];
    } catch (err) {
      seasons = [];
    }
    if (updatedLine) updatedLine.textContent = formatUpdated(hub.source_updated_at || hub.generated_at, hub.timezone);
    showStale(hub);
    if (hubWarning) {
      const warnings = (hub.warnings || []).filter((item) => !/win probabilit/i.test(item));
      hubWarning.textContent = warnings.join(" ");
    }
    if (shareLink) {
      const latest = hub.latest_final_recap;
      const summary = latest
        ? `Fantasy hub. Latest archived recap: ${latest.season_id} week ${latest.period_id}.`
        : "Fantasy hub. No finalized recap is linked yet.";
      const pageUrl = document.querySelector('link[rel="canonical"]')?.href || window.location.href;
      shareLink.href = `https://wa.me/?text=${encodeURIComponent(summary + " " + pageUrl)}`;
    }
    clear(seasonSelect);
    seasons.forEach((season) => {
      const option = document.createElement("option");
      option.value = season.season_id;
      option.textContent = season.label || season.season_id;
      seasonSelect.appendChild(option);
    });
    if (!seasons.length) {
      renderMatchups(null);
      return;
    }
    const preferred = seasons.find((season) => season.season_id === hub.season_id) || seasons[0];
    seasonSelect.value = preferred.season_id;
    seasonSelect.addEventListener("change", () => {
      const season = seasons.find((item) => item.season_id === seasonSelect.value);
      if (season) selectSeason(season, hub);
    });
    await selectSeason(preferred, hub);
    } catch (err) {
      if (statusLine) statusLine.textContent = "The hub could not be shown.";
      if (hubWarning) hubWarning.textContent = "Matchup data is unavailable.";
    }
  }

  init();
})();
