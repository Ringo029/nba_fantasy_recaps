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

  function renderMatchups(progress) {
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
      title.textContent = `${text(row.home_team_name)} vs ${text(row.away_team_name)}`;
      card.appendChild(title);
      paragraph(card, "", `${displayMetric(row.home_score)} – ${displayMetric(row.away_score)}`);
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

  function renderLiveStandings(doc, seasonId) {
    const root = document.getElementById("teamsList");
    const teamsSection = document.getElementById("teams-section");
    const teamsJump = document.getElementById("teams-jump");
    if (!root || !doc || !Array.isArray(doc.standings)) return;
    if (teamsSection) teamsSection.hidden = false;
    if (teamsJump) teamsJump.hidden = false;
    clear(root);
    doc.standings.forEach((row) => {
      const div = document.createElement("div");
      div.className = "team";
      const link = document.createElement("a");
      link.className = "team-link";
      link.href = `team_insights.html?season=${encodeURIComponent(seasonId)}&team_id=${encodeURIComponent(row.team_id)}`;
      const info = document.createElement("div");
      const name = document.createElement("div");
      name.className = "tname";
      name.textContent = row.team_name;
      const meta = document.createElement("div");
      meta.className = "team-meta";
      meta.textContent = `#${displayMetric(row.rank)} ${displayMetric(row.wins)}-${displayMetric(row.losses)}-${displayMetric(row.ties)}. Power rank: ${displayMetric(row.power_rank)}.`;
      info.append(name, meta);
      link.appendChild(info);
      div.appendChild(link);
      root.appendChild(div);
    });
    if (teamsNote) {
      teamsNote.textContent = "Standings from this capture. Power rank is unavailable when no power score was published. Null values stay Unavailable.";
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
      title.textContent = provisional ? `${periodLabel} · Matchup progress` : periodLabel;
      const link = document.createElement("a");
      link.href = row.url || "#";
      link.textContent = provisional ? "Matchup progress" : "Open";
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

  async function selectSeason(season, hub) {
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
    const hero = document.getElementById("hero-summary");
    const teamsSection = document.getElementById("teams-section");
    const teamsJump = document.getElementById("teams-jump");
    const leagueLine = document.getElementById("leagueLine");
    const showArchivePanels = Boolean(season.archive);
    if (hero) hero.hidden = !showArchivePanels;
    if (leagueLine) {
      leagueLine.dataset.managed = "hub";
      leagueLine.textContent = showArchivePanels
        ? "THE LEAGUE • 2025–26 archive"
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
    try {
      if (live) {
        const progress = await loadJson(`data/seasons/${season.season_id}/weeks/${hub.matchup_period_id}/matchup_progress.json`);
        renderMatchups(progress);
      } else {
        renderMatchups(null);
      }
    } catch (err) {
      renderMatchups(null);
    }
    if (live) {
      try {
        renderFixtures(await loadJson(`data/seasons/${season.season_id}/weeks/${hub.matchup_period_id}/fixtures.json`));
      } catch (err) {
        renderFixtures(null);
      }
      try {
        renderLiveStandings(await loadJson(`data/seasons/${season.season_id}/standings.json`), season.season_id);
      } catch (err) {
        if (teamsNote) teamsNote.textContent = "Standings are unavailable for this capture.";
      }
    }
    try {
      const index = await loadJson(season.recap_index);
      renderArchive(index, season.season_id);
    } catch (err) {
      const root = document.getElementById("recapsList");
      if (root) {
        clear(root);
        paragraph(root, "empty-state", "The recap index for this season is not available.");
      }
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
