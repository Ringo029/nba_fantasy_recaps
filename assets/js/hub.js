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

  function text(value) {
    return String(value ?? "");
  }

  function clear(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function paragraph(parent, className, value) {
    const el = document.createElement("p");
    if (className) el.className = className;
    el.textContent = value;
    parent.appendChild(el);
    return el;
  }

  function savedTeamId() {
    try {
      return localStorage.getItem(TEAM_KEY) || "";
    } catch (err) {
      return "";
    }
  }

  function applySavedTeam() {
    const id = savedTeamId();
    if (myTeamLink) {
      myTeamLink.href = id ? `team_insights.html?team_id=${encodeURIComponent(id)}` : "team_insights.html";
    }
  }

  function formatUpdated(iso, timezone) {
    if (!iso) return "No refresh timestamp has been published.";
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "The published timestamp could not be read.";
    return `Updated ${date.toLocaleString(undefined, { timeZoneName: "short" })} (${timezone || "league time"})`;
  }

  function showStale(hub) {
    if (!staleWarning) return;
    const hours = Number(hub.stale_after_hours || 6);
    if (!hub.generated_at) {
      staleWarning.hidden = false;
      staleWarning.textContent = "Live data has not been published. Choose 2025–26 to open the archived recaps.";
      return;
    }
    const age = Date.now() - new Date(hub.generated_at).getTime();
    if (Number.isNaN(age) || age > hours * 60 * 60 * 1000) {
      staleWarning.hidden = false;
      staleWarning.textContent = `This update is older than ${hours} hours. A newer publication has not replaced it.`;
      return;
    }
    staleWarning.hidden = true;
    staleWarning.textContent = "";
  }

  function renderMatchups(progress, status) {
    clear(cards);
    const rows = progress && Array.isArray(progress.matchups) ? progress.matchups : [];
    if (!rows.length) {
      paragraph(cards, "empty-state", status === "unavailable"
        ? "Matchup progress is not available for this season."
        : "No matchup cards were published for this period.");
      return;
    }
    rows.forEach((row) => {
      const card = document.createElement("article");
      card.className = "card matchup-card";
      const title = document.createElement("h3");
      title.textContent = `${text(row.home_team_name)} vs ${text(row.away_team_name)}`;
      card.appendChild(title);
      paragraph(card, "", `${row.home_score ?? "—"} – ${row.away_score ?? "—"}`);
      paragraph(card, "footer", `Games remaining: ${row.home_games_remaining ?? "—"} / ${row.away_games_remaining ?? "—"}`);
      const projected = row.home_projected_finish == null && row.away_projected_finish == null
        ? "Projected finish unavailable."
        : `Projected finish (not a win probability): ${row.home_projected_finish ?? "—"} – ${row.away_projected_finish ?? "—"}`;
      paragraph(card, "footer", projected);
      if (row.projection_note) paragraph(card, "footer", text(row.projection_note));
      cards.appendChild(card);
    });
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
      title.textContent = `${seasonId} matchup ${String(row.period_id || row.week).padStart(2, "0")}`;
      const link = document.createElement("a");
      link.href = row.url || "#";
      link.textContent = "Open";
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
    if (statusLine) {
      if (season.season_id === liveSeason && hub.matchup_period_id) {
        statusLine.textContent = `Matchup ${hub.matchup_period_id}: ${hub.period_start || "—"} to ${hub.period_end || "—"}. Status: ${hub.status}.`;
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
    if (teamsSection) teamsSection.hidden = !showArchivePanels;
    if (teamsJump) teamsJump.hidden = !showArchivePanels;
    if (leagueLine) {
      leagueLine.dataset.managed = "hub";
      leagueLine.textContent = showArchivePanels
        ? "THE LEAGUE • 2025–26 archive"
        : "THE LEAGUE • 2026–27";
    }
    if (teamsNote) {
      teamsNote.textContent = showArchivePanels
        ? "Last published team directory for 2025–26. It is not a standings snapshot for an individual archived week."
        : "A team directory for this season has not been published. The 2025–26 list is hidden so it is not read as this season's standings.";
    }
    try {
      if (season.season_id === liveSeason && hub.status !== "unavailable" && hub.matchup_period_id) {
        const progress = await loadJson(`data/seasons/${season.season_id}/weeks/${hub.matchup_period_id}/matchup_progress.json`);
        renderMatchups(progress, hub.status);
      } else {
        renderMatchups(null, "unavailable");
      }
    } catch (err) {
      renderMatchups(null, "unavailable");
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
    applySavedTeam();
    if (statusLine) statusLine.textContent = "Loading hub data…";
    let hub = { status: "unavailable", warnings: ["Hub data could not be loaded."], stale_after_hours: 6 };
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
    if (updatedLine) updatedLine.textContent = formatUpdated(hub.generated_at, hub.timezone);
    showStale(hub);
    if (hubWarning) hubWarning.textContent = (hub.warnings || []).join(" ");
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
      renderMatchups(null, "unavailable");
      return;
    }
    const preferred = seasons.find((season) => season.season_id === hub.season_id) || seasons[0];
    seasonSelect.value = preferred.season_id;
    seasonSelect.addEventListener("change", () => {
      const season = seasons.find((item) => item.season_id === seasonSelect.value);
      if (season) selectSeason(season, hub);
    });
    await selectSeason(preferred, hub);
  }

  init();
})();
