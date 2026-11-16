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
    if (seasonId && window.LeagueShell) LeagueShell.rememberSeason(seasonId);
    const savedSeason = window.LeagueShell ? LeagueShell.readSaved().season : "";
    const href = window.LeagueShell
      ? LeagueShell.myTeamHref(location.pathname, { season: seasonId || savedSeason, teamId: savedTeamId() })
      : "team_insights.html";
    document.querySelectorAll("[data-nav='my-team']").forEach((link) => {
      link.href = href;
    });
    if (myTeamLink) myTeamLink.href = href;
  }

  function formatUpdated(iso, timezone) {
    if (window.LeagueShell) return LeagueShell.updatedLabel(iso, timezone);
    return iso ? `Updated ${iso}` : "Updated time unavailable";
  }

  function showStale(hub) {
    if (!staleWarning) return;
    const hours = Number(hub.stale_after_hours || 6);
    const messages = [];
    if (hub.data_mode && hub.data_mode !== "live") {
      messages.push("This is not a live update.");
    }
    if (!hub.generated_at) {
      messages.push("A live update has not been published. Choose 2025–26 for the archived recaps.");
    } else {
      const age = Date.now() - new Date(hub.generated_at).getTime();
      if (Number.isNaN(age) || age > hours * 60 * 60 * 1000) {
        messages.push(`This update is more than ${hours} hours old.`);
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
      if (!remainingMissing) {
        paragraph(
          card,
          "footer",
          `Games left: ${displayMetric(row.home_games_remaining)} / ${displayMetric(row.away_games_remaining)}`
        );
      }
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
      fixtureCount.textContent = "Future games: Unavailable";
      fixtureNote.textContent = "A future-game count was not published.";
      return;
    }
    const future = fixtures.counts.scheduled_future_tipoffs;
    fixtureCount.textContent = `Future games on the fantasy schedule: ${displayMetric(future)}`;
    fixtureNote.textContent = "";
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
      teamsNote.textContent = "Standing rank follows the league record. Power rank stays unavailable when it was not published.";
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
      teamsNote.textContent = "2025–26 team directory. It is not the current season.";
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
      const provisional = row.status !== "final";
      const badge = window.LeagueShell ? LeagueShell.periodBadge(row.status) : (provisional ? "This week" : "Final");
      title.textContent = `Week ${String(row.period_id || row.week).padStart(2, "0")} · ${badge}`;
      const link = document.createElement("a");
      link.href = row.url || "#";
      link.textContent = "Open recap";
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

  function renderCompletedRecap(recap, seasonId, options) {
    const hero = document.getElementById("recaps");
    const source = document.getElementById("hero-source");
    const viewLink = document.getElementById("view-full-recap");
    if (!recap) {
      if (hero) hero.hidden = true;
      return;
    }
    if (hero) hero.hidden = false;
    const period = recap.period_id || recap.week;
    const title = document.getElementById("hero-title");
    const newest = options && options.newest;
    const latest = !newest || String(newest) === String(period);
    if (title && window.LeagueShell) title.textContent = LeagueShell.recapTitle(latest);
    const weekNode = document.getElementById("hero-week");
    if (weekNode) weekNode.textContent = `Week ${String(period).padStart(2, "0")} · Final`;
    setStat("stat-top-row", "stat-top-team", awardValue(recap, "team_of_period", ["Team of the Week"]));
    setStat("stat-mvp-row", "stat-mvp", awardValue(recap, "mvp", ["Weekly MVP", "MVP"]));
    setStat("stat-beat-row", "stat-beatdown", awardValue(recap, "widest_margin", ["Biggest Beatdown", "Biggest win"]));
    setStat("stat-close-row", "stat-closest", awardValue(recap, "closest_matchup", ["Closest Matchup", "Closest"]));
    if (viewLink) {
      viewLink.href = recap.url || "#";
      viewLink.textContent = "Open recap";
    }
    if (source) source.textContent = "";
  }

  function bindRecapPicker(finals, seasonId, navigation) {
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
      option.textContent = `Week ${String(period).padStart(2, "0")}`;
      select.appendChild(option);
    });
    const newest = ordered.length ? (ordered[0].period_id || ordered[0].week) : "";
    const show = (period, historyMode) => {
      const recap = ordered.find((row) => String(row.period_id || row.week) === String(period));
      if (recap) renderCompletedRecap(recap, seasonId, { newest });
      const index = ordered.findIndex((row) => String(row.period_id || row.week) === String(period));
      if (prev) prev.disabled = index < 0 || index >= ordered.length - 1;
      if (next) next.disabled = index <= 0;
      if (historyMode && historyMode !== "none") writeLocation(seasonId, period, historyMode);
    };
    select.onchange = () => show(select.value, "push");
    if (prev) {
      prev.onclick = () => {
        const index = ordered.findIndex((row) => String(row.period_id || row.week) === select.value);
        if (index < ordered.length - 1) {
          select.value = String(ordered[index + 1].period_id || ordered[index + 1].week);
          show(select.value, "push");
        }
      };
    }
    if (next) {
      next.onclick = () => {
        const index = ordered.findIndex((row) => String(row.period_id || row.week) === select.value);
        if (index > 0) {
          select.value = String(ordered[index - 1].period_id || ordered[index - 1].week);
          show(select.value, "push");
        }
      };
    }
    const requested = navigation && navigation.recap;
    const initial = ordered.some((row) => String(row.period_id || row.week) === String(requested))
      ? requested
      : (ordered.length ? (ordered[0].period_id || ordered[0].week) : "");
    if (initial) {
      select.value = String(initial);
      show(initial, "none");
    } else renderCompletedRecap(null, seasonId);
  }

  function writeLocation(seasonId, recap, mode) {
    const url = new URL(window.location.href);
    if (seasonId) url.searchParams.set("season", seasonId);
    if (recap) url.searchParams.set("recap", String(recap));
    else url.searchParams.delete("recap");
    const next = `${url.pathname}${url.search}${url.hash}`;
    const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (next === current) return;
    window.history[mode === "replace" ? "replaceState" : "pushState"]({}, "", next);
  }

  let seasonRequest = 0;

  async function selectSeason(season, hub, navigation) {
    const requestId = ++seasonRequest;
    const teamsRoot = document.getElementById("teamsList");
    if (teamsRoot) clear(teamsRoot);
    const liveSeason = hub && hub.season_id;
    const live = season.season_id === liveSeason && hub.status !== "unavailable" && hub.matchup_period_id;
    const matchupHeading = document.getElementById("matchup-heading");
    if (statusLine) {
      if (live) {
        const heading = window.LeagueShell
          ? LeagueShell.weekHeading(hub.matchup_period_id, hub.period_start, hub.period_end, hub.timezone)
          : `Week ${hub.matchup_period_id}`;
        const badge = window.LeagueShell ? LeagueShell.periodBadge(hub.status) : "This week";
        statusLine.textContent = badge;
        if (matchupHeading) matchupHeading.textContent = heading;
      } else if (season.archive) {
        statusLine.textContent = "Archived season.";
        if (matchupHeading) matchupHeading.textContent = "Current matchups stay with the live season";
      } else {
        statusLine.textContent = "This season does not have a published week yet.";
        if (matchupHeading) matchupHeading.textContent = "This week";
      }
    }
    const teamsSection = document.getElementById("teams-section");
    const standingsHeading = document.getElementById("standings-heading");
    const standingsSub = document.getElementById("standings-sub");
    const showArchivePanels = Boolean(season.archive);
    if (standingsHeading) {
      standingsHeading.textContent = showArchivePanels ? `${season.label} team directory` : "Standings";
    }
    if (standingsSub) {
      standingsSub.textContent = showArchivePanels
        ? "Last published team directory for this archive."
        : "Standing rank follows the league record. Power rank is separate.";
    }
    applyLeagueName(live ? season.season_id : "");
    applySavedTeam(season.season_id || "");
    if (!live) {
      if (fixturePanel) fixturePanel.hidden = true;
      if (teamsSection) teamsSection.hidden = !showArchivePanels;
      if (teamsNote) {
        teamsNote.textContent = showArchivePanels
          ? "2025–26 team directory. It is not the current season."
          : "A team directory for this season has not been published.";
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
      bindRecapPicker(finals, season.season_id, navigation || {});
    } catch (err) {
      const root = document.getElementById("recapsList");
      if (root) {
        clear(root);
        paragraph(root, "empty-state", "The recap index for this season is not available.");
      }
      renderCompletedRecap(null, season.season_id);
    }
    if (window.LeagueShell) {
      LeagueShell.revealLocation(document);
      window.requestAnimationFrame(() => LeagueShell.revealLocation(document));
    }
  }

  async function applyLeagueName(seasonId) {
    const brand = document.getElementById("league-brand");
    if (!brand) return;
    let name = "THE LEAGUE";
    if (seasonId) {
      try {
        const season = await loadJson(`data/seasons/${seasonId}/season.json`);
        name = window.LeagueShell ? LeagueShell.leagueName(season.league_name) : (season.league_name || name);
      } catch (err) {
        name = "THE LEAGUE";
      }
    }
    brand.textContent = name;
    brand.setAttribute("aria-label", "THE LEAGUE — Home");
  }

  function showWarnings(warnings) {
    const mapped = window.LeagueShell ? LeagueShell.memberWarnings(warnings) : { primary: warnings || [], about: [] };
    if (hubWarning) hubWarning.textContent = mapped.primary.join(" ");
    const about = document.getElementById("about-notes");
    if (about) {
      about.textContent = "";
      mapped.about.forEach((line) => paragraph(about, "", line));
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
    showWarnings(hub.warnings || []);
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
    const params = new URLSearchParams(location.search);
    const requestedSeason = params.get("season");
    const preferred = seasons.find((season) => season.season_id === requestedSeason)
      || seasons.find((season) => season.season_id === hub.season_id)
      || seasons[0];
    seasonSelect.value = preferred.season_id;
    seasonSelect.addEventListener("change", () => {
      const season = seasons.find((item) => item.season_id === seasonSelect.value);
      if (!season) return;
      writeLocation(season.season_id, "", "push");
      selectSeason(season, hub, { recap: "" });
    });
    window.addEventListener("popstate", () => {
      const next = new URLSearchParams(location.search);
      const season = seasons.find((item) => item.season_id === next.get("season")) || preferred;
      seasonSelect.value = season.season_id;
      selectSeason(season, hub, { recap: next.get("recap") || "" });
      if (window.LeagueShell) LeagueShell.markLocation(document, location.pathname, location.hash);
    });
    window.addEventListener("hashchange", () => {
      if (window.LeagueShell) {
        LeagueShell.markLocation(document, location.pathname, location.hash);
        LeagueShell.revealLocation(document);
      }
    });
    await selectSeason(preferred, hub, { recap: params.get("recap") || "" });
    if (window.LeagueShell) LeagueShell.revealLocation(document);
    } catch (err) {
      if (statusLine) statusLine.textContent = "The hub could not be shown.";
      if (hubWarning) hubWarning.textContent = "Matchup data is unavailable.";
    }
  }

  init();
})();
