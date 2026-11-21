(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.LeagueShell = api;
  if (typeof document !== "undefined") {
    const start = () => {
      api.install(document);
      api.revealLocation(document);
    };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
    else start();
    window.addEventListener("hashchange", () => {
      api.markLocation(document, location.pathname, location.hash);
      api.revealLocation(document);
    });
    window.addEventListener("resize", () => api.syncHeaderOffset(document));
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const PAGES_ROOT = "/nba_fantasy_recaps/";
  const HOME_LABEL = "THE LEAGUE — Home";
  const SEASON_KEY = "fb_my_season";
  const TEAM_KEY = "fb_my_team_id";

  function homeHref(pathname) {
    const path = String(pathname || "/").replace(/\\/g, "/");
    const marker = PAGES_ROOT;
    const at = path.toLowerCase().indexOf(marker);
    if (at === 0) return marker;
    if (at > 0) return relativeFromRest(path.slice(at + marker.length));
    if (path.startsWith("/")) return "/";
    return relativeFromRest(path);
  }

  function relativeFromRest(rest) {
    const parts = String(rest || "").split("/").filter(Boolean);
    if (parts.length && /\.[a-z0-9]+$/i.test(parts[parts.length - 1])) parts.pop();
    if (!parts.length) return "./";
    return "../".repeat(parts.length);
  }

  function withHash(home, hash) {
    return `${home}#${hash}`;
  }

  function sectionHref(pathname, section) {
    return withHash(homeHref(pathname), section);
  }

  function myTeamHref(pathname, saved) {
    const home = homeHref(pathname);
    const params = new URLSearchParams();
    if (saved && saved.season) params.set("season", String(saved.season));
    if (saved && saved.teamId) params.set("team_id", String(saved.teamId));
    const query = params.toString();
    return `${home}team_insights.html${query ? `?${query}` : ""}`;
  }

  function leagueName(value) {
    const text = String(value || "").trim();
    if (!text || text.toLowerCase() === "league") return "THE LEAGUE";
    return text;
  }

  function calendarDate(iso) {
    const match = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return null;
    return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 17));
  }

  function weekRange(start, end, timeZone) {
    const zone = timeZone || "America/New_York";
    const left = calendarDate(start);
    const right = calendarDate(end);
    if (!left || !right) return "";
    const format = new Intl.DateTimeFormat("en-US", { timeZone: zone, month: "short", day: "numeric" });
    const leftText = format.format(left);
    const rightParts = format.formatToParts(right);
    const part = (parts, type) => (parts.find((item) => item.type === type) || {}).value || "";
    const leftMonth = part(format.formatToParts(left), "month");
    const rightMonth = part(rightParts, "month");
    const rightDay = part(rightParts, "day");
    if (leftMonth && leftMonth === rightMonth) return `${leftText}–${rightDay}`;
    return `${leftText}–${format.format(right)}`;
  }

  function weekHeading(period, start, end, timeZone) {
    const range = weekRange(start, end, timeZone);
    const label = `Week ${Number(period)}`;
    return range ? `${label} · ${range}` : label;
  }

  function periodBadge(status) {
    return status === "final" ? "Final" : "This week";
  }

  function recapTitle(isLatest) {
    return isLatest ? "Latest completed recap" : "Selected recap";
  }

  function clockLabel(iso, timeZone, prefix) {
    const zone = timeZone || "America/New_York";
    if (!iso) return `${prefix} time unavailable`;
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return `${prefix} time unavailable`;
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZoneName: "short",
    }).formatToParts(date);
    const get = (type) => (parts.find((item) => item.type === type) || {}).value || "";
    return `${prefix} ${get("month")} ${get("day")}, ${get("hour")}:${get("minute")} ${get("dayPeriod")} ${get("timeZoneName")}`.replace(/\s+/g, " ").trim();
  }

  function updatedLabel(iso, timeZone) {
    return clockLabel(iso, timeZone, "Updated");
  }

  function asOfLabel(iso, timeZone) {
    return clockLabel(iso, timeZone, "Roster as of");
  }

  const METHODOLOGY = [
    { pattern: /win probabilit/i, about: "Win probabilities are not published." },
    { pattern: /null values stay unavailable/i, about: "" },
    { pattern: /box-score totals|points-for\/points-against|power score was published/i, about: "Scores are the fantasy totals for each week. Standing rank follows the league record. Power rank is separate." },
    { pattern: /fixture source|fantasy pro schedule|remaining-game count|nba official schedule|game status is unavailable/i, about: "The future-game count is the fantasy schedule. It is not games left on a roster." },
  ];

  function memberWarnings(warnings) {
    const primary = [];
    const about = [];
    (warnings || []).forEach((item) => {
      const text = String(item || "").trim();
      if (!text) return;
      const known = METHODOLOGY.find((row) => row.pattern.test(text));
      if (known) {
        if (known.about && about.indexOf(known.about) === -1) about.push(known.about);
        return;
      }
      primary.push(text);
    });
    return { primary, about };
  }

  function readSaved() {
    const saved = { season: "", teamId: "" };
    try {
      saved.season = localStorage.getItem(SEASON_KEY) || "";
      saved.teamId = localStorage.getItem(TEAM_KEY) || "";
    } catch (err) {
      return saved;
    }
    return saved;
  }

  function rememberSeason(seasonId) {
    try {
      if (seasonId) localStorage.setItem(SEASON_KEY, String(seasonId));
    } catch (err) {
      return;
    }
  }

  function pageKind(pathname) {
    const path = String(pathname || "");
    if (/team_insights\.html/i.test(path)) return "my-team";
    if (/\/recaps\//i.test(path)) return "recaps";
    if (/\/articles\//i.test(path)) return "around";
    return "home";
  }

  function onHome(pathname) {
    return pageKind(pathname) === "home";
  }

  function aroundHref(pathname) {
    return `${homeHref(pathname)}articles/index.html`;
  }

  function ensureAroundLink(doc) {
    const nav = doc.querySelector && doc.querySelector(".league-nav");
    if (!nav || nav.querySelector("[data-nav='around']")) return;
    const link = doc.createElement("a");
    link.setAttribute("data-nav", "around");
    link.textContent = "Around The League";
    const team = nav.querySelector("[data-nav='my-team']");
    if (team) nav.insertBefore(link, team);
    else nav.appendChild(link);
  }

  function ensureArticleScript(doc, pathname) {
    if (!doc || !doc.createElement || !doc.querySelector || doc.querySelector("script[data-articles]")) return;
    const script = doc.createElement("script");
    script.src = `${homeHref(pathname)}assets/js/articles.js?v=20261121c`;
    script.setAttribute("data-articles", "true");
    (doc.body || doc.documentElement).appendChild(script);
  }

  function markLocation(doc, pathname, hash) {
    const path = String(pathname || "");
    const kind = pageKind(path);
    const home = kind === "home";
    const current = {
      home: home && !hash,
      matchups: home && hash === "#matchups",
      recaps: kind === "recaps" || (home && hash === "#recaps"),
      "all-recaps": home && hash === "#all-recaps",
      standings: home && hash === "#standings",
      "my-team": kind === "my-team",
      around: kind === "around",
    };
    doc.querySelectorAll("[data-nav]").forEach((link) => {
      const key = link.getAttribute("data-nav");
      if (current[key]) link.setAttribute("aria-current", home && hash ? "location" : "page");
      else link.removeAttribute("aria-current");
    });
  }

  function install(doc, pathname) {
    if (!doc || !doc.querySelector) return;
    const path = pathname || (typeof location !== "undefined" ? location.pathname : "/");
    const hash = typeof location !== "undefined" && !pathname ? location.hash : "";
    const home = homeHref(path);
    const saved = readSaved();
    ensureAroundLink(doc);
    doc.querySelectorAll(".league-brand").forEach((link) => {
      link.href = home;
      link.setAttribute("aria-label", HOME_LABEL);
    });
    const routes = {
      home,
      matchups: withHash(home, "matchups"),
      recaps: withHash(home, "recaps"),
      "all-recaps": withHash(home, "all-recaps"),
      standings: withHash(home, "standings"),
      around: aroundHref(path),
      "my-team": myTeamHref(path, saved),
    };
    doc.querySelectorAll("[data-nav]").forEach((link) => {
      const key = link.getAttribute("data-nav");
      if (routes[key]) link.href = routes[key];
    });
    markLocation(doc, path, hash);
    syncHeaderOffset(doc);
    if (typeof document !== "undefined" && doc === document) {
      setTimeout(() => ensureArticleScript(doc, path), 0);
    }
  }

  function syncHeaderOffset(doc) {
    if (!doc || !doc.documentElement) return 0;
    const header = doc.querySelector(".league-header");
    const height = header ? Math.ceil(header.getBoundingClientRect().height) + 12 : 76;
    doc.documentElement.style.setProperty("--header-offset", `${height}px`);
    return height;
  }

  function revealLocation(doc) {
    if (!doc || !doc.getElementById || typeof location === "undefined") return;
    syncHeaderOffset(doc);
    const id = String(location.hash || "").replace(/^#/, "");
    if (!id) return;
    const target = doc.getElementById(decodeURIComponent(id));
    if (!target || !target.scrollIntoView) return;
    target.scrollIntoView({ block: "start" });
  }

  return {
    HOME_LABEL,
    SEASON_KEY,
    homeHref,
    sectionHref,
    myTeamHref,
    aroundHref,
    pageKind,
    leagueName,
    weekRange,
    weekHeading,
    periodBadge,
    recapTitle,
    updatedLabel,
    asOfLabel,
    memberWarnings,
    rememberSeason,
    readSaved,
    markLocation,
    install,
    syncHeaderOffset,
    revealLocation,
  };
});
