(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.LeagueArticles = api;
  if (typeof document !== "undefined") {
    const start = () => api.mount(document);
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
    else start();
    document.addEventListener("league-recap-selected", (event) => {
      const detail = (event && event.detail) || {};
      api.showWeek(detail.seasonId, detail.period);
    });
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const ATTRIBUTION = "Member analysis";
  const state = { articles: null, home: "./", doc: null, pending: null };

  function publicationLabel(iso) {
    if (!iso) return "Publication date unavailable";
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "Publication date unavailable";
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  }

  function weekLabel(seasonId, period) {
    const season = String(seasonId || "").replace("-", "–");
    return `Around The League · ${season} · Week ${period}`;
  }

  function selectFeatured(articles) {
    const flagged = (articles || []).filter((article) => article && article.featured);
    flagged.sort((a, b) => {
      const byDate = String(a.published_at || "").localeCompare(String(b.published_at || ""));
      if (byDate) return byDate;
      return String(a.article_id || "").localeCompare(String(b.article_id || ""));
    });
    return flagged.length ? flagged[flagged.length - 1] : null;
  }

  function articlesForWeek(articles, seasonId, period) {
    const week = Number(period);
    return (articles || [])
      .filter((article) => article && article.season_id === seasonId && Number(article.matchup_period_id) === week)
      .sort((a, b) => {
        const byDate = String(b.published_at || "").localeCompare(String(a.published_at || ""));
        if (byDate) return byDate;
        return String(b.article_id || "").localeCompare(String(a.article_id || ""));
      });
  }

  function listingArticles(articles) {
    const featured = selectFeatured(articles);
    const rest = (articles || []).filter((article) => !featured || article.article_id !== featured.article_id);
    rest.sort((a, b) => String(b.published_at || "").localeCompare(String(a.published_at || "")));
    return { featured, rest };
  }

  function parseRecapLocation(pathname) {
    const match = String(pathname || "").replace(/\\/g, "/").match(/seasons\/(\d{4}-\d{2})\/recaps\/(?:period|week)-(\d+)\.html/i);
    if (!match) return null;
    return { seasonId: match[1], period: Number(match[2]) };
  }

  function shareHref(title, pageUrl) {
    return `https://wa.me/?text=${encodeURIComponent(`${title || ""}\n${pageUrl || ""}`)}`;
  }

  function articleHref(home, article) {
    const slug = String((article && article.slug) || "");
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return home || "./";
    return `${home || "./"}articles/${slug}.html`;
  }

  function safeSitePath(value) {
    const text = String(value || "");
    if (!text || text.indexOf("\\") !== -1 || /javascript:/i.test(text)) return "";
    if (/^\?season=\d{4}-\d{2}&recap=\d+#(?:recaps|matchups)$/.test(text)) return text;
    if (/^seasons\/\d{4}-\d{2}\/recaps\/(?:period|week)-\d{2}\.html$/.test(text)) return text;
    return "";
  }

  function clear(node) {
    while (node && node.firstChild) node.removeChild(node.firstChild);
  }

  function addText(parent, className, value) {
    const el = parent.ownerDocument.createElement("p");
    if (className) el.className = className;
    el.textContent = value;
    parent.appendChild(el);
    return el;
  }

  function renderCard(doc, article, home) {
    const card = doc.createElement("article");
    card.className = "around-card";
    addText(card, "around-attribution", ATTRIBUTION);
    const heading = doc.createElement("h3");
    const title = doc.createElement("a");
    title.href = articleHref(home, article);
    title.textContent = article.title || "";
    heading.appendChild(title);
    card.appendChild(heading);
    addText(card, null, article.excerpt || "");
    addText(card, "around-meta", article.author_display_name || "");
    addText(card, "around-meta", publicationLabel(article.published_at));
    const season = String(article.season_id || "").replace("-", "–");
    addText(card, "around-meta", `${season} · Week ${article.matchup_period_id} · ${article.article_type || ""}`);
    if (article.score_citation) addText(card, "score-citation", article.score_citation);
    const recap = safeSitePath(article.recap_href);
    if (recap) {
      const link = doc.createElement("a");
      link.href = `${home || "./"}${recap}`;
      link.textContent = recap.endsWith(".html") ? `${season} Week ${article.matchup_period_id} recap` : `${season} Week ${article.matchup_period_id} matchups`;
      card.appendChild(link);
    }
    return card;
  }

  function renderFeatured(doc, articles, home) {
    const section = doc.getElementById("around-featured");
    if (!section) return;
    const body = doc.getElementById("around-featured-body");
    const featured = selectFeatured(articles);
    if (!featured || !body) {
      section.hidden = true;
      return;
    }
    clear(body);
    body.appendChild(renderCard(doc, featured, home));
    section.hidden = false;
  }

  function renderWeek(doc, articles, seasonId, period, home) {
    const section = doc.getElementById("around-week");
    if (!section) return;
    const list = doc.getElementById("around-week-list");
    const title = doc.getElementById("around-week-title");
    const rows = seasonId && period ? articlesForWeek(articles, seasonId, period) : [];
    if (title) title.textContent = rows.length && seasonId ? weekLabel(seasonId, period) : "Around The League";
    if (!list || !rows.length) {
      if (list) clear(list);
      section.hidden = true;
      return;
    }
    clear(list);
    rows.forEach((article) => list.appendChild(renderCard(doc, article, home)));
    section.hidden = false;
  }

  function renderListing(doc, articles, home) {
    const list = doc.getElementById("around-cards");
    if (!list) return;
    const empty = doc.getElementById("around-empty");
    const ordered = listingArticles(articles);
    const rows = ordered.featured ? [ordered.featured].concat(ordered.rest) : ordered.rest;
    clear(list);
    if (!rows.length) {
      if (empty) empty.hidden = false;
      return;
    }
    if (empty) empty.hidden = true;
    rows.forEach((article) => list.appendChild(renderCard(doc, article, home)));
  }

  function ensureRecapSection(doc, parsed) {
    let section = doc.getElementById("around-the-league");
    if (section || !parsed) return section;
    const main = doc.querySelector("main") || doc.body;
    section = doc.createElement("section");
    section.id = "around-the-league";
    section.className = "card around-league";
    section.hidden = true;
    section.setAttribute("data-season", parsed.seasonId);
    section.setAttribute("data-period", String(parsed.period));
    const wrap = doc.createElement("div");
    wrap.className = "card-b";
    const title = doc.createElement("h2");
    title.textContent = "Around The League";
    const note = doc.createElement("p");
    note.className = "around-note";
    note.textContent = "Member analysis for this week. Separate from the generated recap.";
    const list = doc.createElement("div");
    list.className = "around-list";
    wrap.append(title, note, list);
    section.appendChild(wrap);
    const about = doc.getElementById("about-data");
    if (about && about.parentNode) about.parentNode.insertBefore(section, about);
    else main.appendChild(section);
    return section;
  }

  function renderRecap(doc, articles, home, pathname) {
    const parsed = parseRecapLocation(pathname);
    const section = ensureRecapSection(doc, parsed);
    if (!section) return;
    const list = section.querySelector(".around-list");
    const seasonId = section.getAttribute("data-season") || (parsed && parsed.seasonId);
    const period = section.getAttribute("data-period") || (parsed && parsed.period);
    const title = section.querySelector("h2");
    const rows = articlesForWeek(articles, seasonId, period);
    if (title && rows.length) title.textContent = weekLabel(seasonId, period);
    if (!list || !rows.length) {
      if (list) clear(list);
      section.hidden = true;
      return;
    }
    clear(list);
    rows.forEach((article) => list.appendChild(renderCard(doc, article, home)));
    section.hidden = false;
  }

  function showWeek(seasonId, period) {
    state.pending = { seasonId: seasonId || "", period: period || "" };
    if (!state.articles || !state.doc) return;
    renderWeek(state.doc, state.articles, state.pending.seasonId, state.pending.period, state.home);
  }

  function homeFrom() {
    const path = typeof location !== "undefined" ? location.pathname : "/";
    const shell = typeof globalThis !== "undefined" ? globalThis.LeagueShell : null;
    if (shell && shell.homeHref) return shell.homeHref(path);
    return "./";
  }

  function mount(doc) {
    const home = homeFrom();
    state.home = home;
    state.doc = doc;
    const request = typeof fetch === "function" ? fetch(`${home}data/articles/index.json`, { cache: "no-store" }) : Promise.reject();
    return Promise.resolve(request)
      .then((response) => (response && response.ok ? response.json() : null))
      .then((index) => {
        if (!index) return;
        const articles = index.articles || [];
        state.articles = articles;
        if (index.preview && doc.body && !doc.querySelector(".preview-banner")) {
          const banner = doc.createElement("p");
          banner.className = "preview-banner";
          banner.textContent = "Local preview. This draft is not approved for publication.";
          doc.body.insertBefore(banner, doc.body.firstChild);
        }
        renderFeatured(doc, articles, home);
        renderListing(doc, articles, home);
        const path = typeof location !== "undefined" ? location.pathname : "";
        renderRecap(doc, articles, home, path);
        const selected = state.pending || readSelection(doc);
        if (selected && selected.period) renderWeek(doc, articles, selected.seasonId, selected.period, home);
      })
      .catch(() => {});
  }

  function readSelection(doc) {
    const season = doc.getElementById && doc.getElementById("season-select");
    const week = doc.getElementById && doc.getElementById("week-select");
    return { seasonId: (season && season.value) || "", period: (week && week.value) || "" };
  }

  return {
    ATTRIBUTION,
    publicationLabel,
    weekLabel,
    selectFeatured,
    articlesForWeek,
    listingArticles,
    parseRecapLocation,
    shareHref,
    articleHref,
    safeSitePath,
    showWeek,
    mount,
  };
});
