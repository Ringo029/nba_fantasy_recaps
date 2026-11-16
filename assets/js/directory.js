(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.FantasyDirectory = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function approvedImageUrl(value) {
    if (!value || typeof value !== "string") return "";
    const text = value.trim();
    if (!text || text.startsWith("//") || /[\s<>"']/.test(text)) return "";
    if (text.startsWith("/") || (!/^[a-z][a-z0-9+.-]*:/i.test(text) && !text.includes("\\"))) return text;
    let url;
    try {
      url = new URL(text);
    } catch (err) {
      return "";
    }
    if (url.protocol === "https:") return text;
    if (url.protocol === "http:" && (url.hostname === "localhost" || url.hostname === "127.0.0.1")) return text;
    return "";
  }

  function initials(name) {
    const words = String(name || "").trim().split(/\s+/).filter(Boolean).slice(0, 2);
    const letters = words.map((word) => word[0]).join("").toUpperCase();
    return letters || "?";
  }

  function fallbackElement(documentRef, name) {
    const span = documentRef.createElement("span");
    span.className = "logo-fallback";
    span.textContent = initials(name);
    if (typeof span.setAttribute === "function") {
      span.setAttribute("role", "img");
      span.setAttribute("aria-label", `${name || "Team"} logo`);
    }
    return span;
  }

  function logoElement(url, name, doc) {
    const documentRef = doc || (typeof document !== "undefined" ? document : null);
    if (!documentRef) throw new Error("A document is required to create a logo.");
    const approved = approvedImageUrl(url);
    if (!approved) return fallbackElement(documentRef, name);
    const img = documentRef.createElement("img");
    img.src = approved;
    img.alt = `${name || "Team"} logo`;
    if (typeof img.setAttribute === "function") img.setAttribute("data-team-name", name || "Team");
    img.addEventListener("error", function onError() {
      if (img.__fallbackApplied) return;
      img.__fallbackApplied = true;
      const fallback = fallbackElement(documentRef, name);
      if (typeof img.replaceWith === "function") img.replaceWith(fallback);
    });
    return img;
  }

  function indexByTeamId(teams, seasonId) {
    const directory = { seasonId: seasonId || "", byId: {} };
    (teams || []).forEach((team) => {
      if (team && team.team_id != null) directory.byId[String(team.team_id)] = team;
    });
    return directory;
  }

  function profileFor(directory, teamId) {
    if (!directory || !directory.byId) return {};
    return directory.byId[String(teamId)] || {};
  }

  function acceptDirectory(requestId, currentRequest, directory) {
    if (requestId !== currentRequest) return null;
    return directory;
  }

  function dataSources(seasonId) {
    if (seasonId === "2026-27") {
      return {
        teams: "data/seasons/2026-27/teams.json",
        standings: "data/seasons/2026-27/standings.json",
        archiveDirectory: null,
      };
    }
    return {
      teams: null,
      standings: null,
      archiveDirectory: "data/league_metadata.json",
    };
  }

  function movementText(value) {
    const text = String(value ?? "").trim();
    return text;
  }

  function movementClass(value) {
    const text = movementText(value);
    if (/^up\b/i.test(text) || text.startsWith("^")) return "power-movement movement-up";
    if (/^down\b/i.test(text)) return "power-movement movement-down";
    return "power-movement";
  }

  function chosenTeamId(urlId, savedId, ids) {
    const options = (ids || []).map((id) => String(id));
    if (urlId && options.includes(String(urlId))) return String(urlId);
    if (savedId && options.includes(String(savedId))) return String(savedId);
    return options[0] || "";
  }

  function sectionVisibility(caps) {
    const source = caps || {};
    return {
      categories: Boolean(source.categories),
      projection: Boolean(source.projection),
      roster: Boolean(source.roster),
      opponent: Boolean(source.opponent),
      watchlist: Boolean(source.watchlist),
      history: Boolean(source.history),
    };
  }

  function opponentInMatchup(matchups, teamId) {
    const id = String(teamId);
    const row = (matchups || []).find((item) => String(item.home_team_id) === id || String(item.away_team_id) === id);
    if (!row) return null;
    const home = String(row.home_team_id) === id;
    return {
      team_id: home ? row.away_team_id : row.home_team_id,
      team_name: home ? row.away_team_name : row.home_team_name,
      period_id: row.period_id,
    };
  }

  const AVERAGE_NOTE = "ESPN appliedAverage on the season-total split (stat id prefix 00), rounded to 2 decimals. On the payloads checked for this client, that value equals appliedTotal divided by GP on the same split. GP is games that player has played, not team games and not fantasy matchup periods.";

  function playerFacts(player, options) {
    const row = player || {};
    const onList = Boolean(options && options.freeAgentList);
    const injury = row.injury_status
      ? `Injury status at capture: ${row.injury_status}. This is not a record of earlier games.`
      : "Injury status was not provided at capture.";
    let average = "ESPN appliedAverage was not provided.";
    if (row.avg_fantasy_points != null && row.avg_fantasy_points !== "") {
      const games = row.games_played == null || row.games_played === "" ? "" : ` over ${row.games_played} GP`;
      average = `ESPN appliedAverage ${row.avg_fantasy_points}${games} on the season-total split`;
    }
    let acquisition = "Acquisition type was not provided at capture.";
    if (row.acquisition_status === "free_agent" || (onList && !row.acquisition_status)) {
      acquisition = "On the captured free-agent list. Waiver priority and availability are not inferred.";
    } else if (row.acquisition_status) {
      acquisition = `ESPN acquisitionType at capture: ${row.acquisition_status}. This is not waiver priority.`;
    }
    return { injury, average, acquisition };
  }

  function completedLines(results, teamId) {
    const id = String(teamId);
    const lines = [];
    (results || []).forEach((doc) => {
      if (!doc || doc.status !== "final") return;
      (doc.results || []).forEach((row) => {
        const home = String(row.home_team_id) === id;
        const away = String(row.away_team_id) === id;
        if (!home && !away) return;
        lines.push({
          season_id: doc.season_id || "",
          period_id: doc.period_id,
          opponent_id: home ? row.away_team_id : row.home_team_id,
          opponent_name: home ? row.away_team_name : row.home_team_name,
          points: home ? row.home_score : row.away_score,
          opponent_points: home ? row.away_score : row.home_score,
        });
      });
    });
    return lines;
  }

  return {
    approvedImageUrl,
    initials,
    logoElement,
    indexByTeamId,
    profileFor,
    acceptDirectory,
    dataSources,
    movementText,
    movementClass,
    chosenTeamId,
    sectionVisibility,
    opponentInMatchup,
    completedLines,
    AVERAGE_NOTE,
    playerFacts,
  };
});
