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
    if (!iso) return "";
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    }).format(date);
  }

  function formatDay(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
    if (!match) return "";
    const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "UTC",
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  }

  function articleDateLabel(article) {
    const parts = [];
    const author = formatDay(article && article.author_date);
    if (author) parts.push(`Written ${author}`);
    if (article && article.published_at) {
      const published = publicationLabel(article.published_at);
      if (published) parts.push(`Published ${published}`);
    }
    if (article && article.updated_at && article.updated_at !== article.published_at) {
      const updated = publicationLabel(article.updated_at);
      if (updated) parts.push(`Updated ${updated}`);
    }
    return parts.join(" · ");
  }

  function movementParts(value) {
    const text = String(value || "").trim();
    const match = /^(Up|Down)\s+(\d+)$/i.exec(text);
    if (match) {
      const direction = match[1].toLowerCase();
      return { arrow: `${direction === "up" ? "↑" : "↓"}${match[2]}`, words: `${direction} ${match[2]}` };
    }
    if (text.toLowerCase() === "unchanged") return { arrow: "", words: "unchanged" };
    return { arrow: "", words: text };
  }

  function contextLabel(context) {
    if (!context || typeof context !== "object") return "";
    const bits = [];
    if (context.wins != null && context.losses != null && context.ties != null) {
      const record = Number(context.ties)
        ? `${context.wins}–${context.losses}–${context.ties}`
        : `${context.wins}–${context.losses}`;
      bits.push(record);
    }
    if (context.standing_rank != null) bits.push(`Standing #${context.standing_rank}`);
    if (context.power_rank != null) {
      let power = `Power #${context.power_rank}`;
      const move = movementParts(context.power_movement);
      if (move.words) power += `, ${move.words}`;
      bits.push(power);
    }
    if (context.label) bits.push(String(context.label));
    return bits.join(" · ");
  }

  function appendContext(doc, parent, context) {
    if (!context || typeof context !== "object") return;
    const row = doc.createElement("p");
    row.className = "around-badges";
    const addBadge = (text, label) => {
      const badge = doc.createElement("span");
      badge.className = "around-badge";
      badge.textContent = text;
      if (label) badge.setAttribute("aria-label", label);
      row.appendChild(badge);
      return badge;
    };
    if (context.wins != null && context.losses != null && context.ties != null) {
      const record = Number(context.ties)
        ? `${context.wins}–${context.losses}–${context.ties}`
        : `${context.wins}–${context.losses}`;
      addBadge(record);
    }
    if (context.standing_rank != null) addBadge(`Standing #${context.standing_rank}`);
    if (context.power_rank != null) {
      const badge = doc.createElement("span");
      badge.className = "around-badge";
      let spoken = `Power rank ${context.power_rank}`;
      badge.appendChild(doc.createTextNode(`Power #${context.power_rank}`));
      const move = movementParts(context.power_movement);
      if (move.arrow && move.words) {
        const icon = doc.createElement("span");
        icon.setAttribute("aria-hidden", "true");
        icon.textContent = ` ${move.arrow}`;
        badge.appendChild(icon);
        const words = doc.createElement("span");
        words.className = "sr-only";
        words.textContent = ` ${move.words}`;
        badge.appendChild(words);
        spoken += `, ${move.words}`;
      } else if (move.words) {
        badge.appendChild(doc.createTextNode(` ${move.words}`));
        spoken += `, ${move.words}`;
      }
      badge.setAttribute("aria-label", spoken);
      row.appendChild(badge);
    }
    if (context.label) {
      const cutoff = doc.createElement("span");
      cutoff.className = "around-cutoff";
      cutoff.textContent = String(context.label);
      if (context.source) cutoff.title = String(context.source);
      row.appendChild(cutoff);
    }
    if (row.childNodes.length) parent.appendChild(row);
  }

  function initials(name) {
    const words = String(name || "").trim().split(/\s+/).filter(Boolean).slice(0, 2);
    return words.map((word) => word[0]).join("").toUpperCase() || "?";
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

  function appendIdentity(doc, parent, article, home) {
    const row = doc.createElement("div");
    row.className = "around-identity";
    const team = article && article.team;
    if (team && team.team_name) {
      const directory = typeof globalThis !== "undefined" ? globalThis.FantasyDirectory : null;
      const logo = directory && directory.logoElement
        ? directory.logoElement(team.logo_url || "", team.team_name, doc)
        : null;
      if (logo) {
        logo.classList.add("around-logo");
        row.appendChild(logo);
      } else {
        const span = doc.createElement("span");
        span.className = "logo-fallback around-logo";
        span.textContent = initials(team.team_name);
        row.appendChild(span);
      }
    }
    const text = doc.createElement("div");
    text.className = "around-identity-text";
    const name = doc.createElement("p");
    name.className = "around-author";
    name.textContent = (article && article.author_display_name) || "";
    text.appendChild(name);
    if (team && team.team_name && team.team_id != null && team.season_id) {
      const flair = doc.createElement("a");
      flair.className = "around-flair";
      flair.href = `${home || "./"}team_insights.html?season=${encodeURIComponent(team.season_id)}&team_id=${encodeURIComponent(team.team_id)}`;
      flair.textContent = team.team_name;
      text.appendChild(flair);
    }
    row.appendChild(text);
    parent.appendChild(row);
  }

  function absoluteArticleUrl(home, article) {
    const href = articleHref(home, article);
    if (typeof location !== "undefined" && location.href) {
      try {
        return new URL(href, location.href).href;
      } catch (err) {
        return href;
      }
    }
    return href;
  }

  function renderCard(doc, article, home) {
    const card = doc.createElement("article");
    card.className = "around-card";
    if (article && article.featured) {
      const kicker = doc.createElement("p");
      kicker.className = "around-kicker";
      kicker.textContent = "Around The League";
      card.appendChild(kicker);
    }
    appendIdentity(doc, card, article, home);
    const heading = doc.createElement("h3");
    const title = doc.createElement("a");
    title.href = articleHref(home, article);
    title.textContent = article.title || "";
    heading.appendChild(title);
    card.appendChild(heading);
    const meta = doc.createElement("p");
    meta.className = "around-meta";
    const badge = doc.createElement("span");
    badge.className = "around-type";
    badge.textContent = article.article_type || "";
    meta.appendChild(badge);
    const season = String(article.season_id || "").replace("-", "–");
    meta.appendChild(doc.createTextNode(` ${season} · Week ${article.matchup_period_id}`));
    const when = articleDateLabel(article);
    if (when) meta.appendChild(doc.createTextNode(` · ${when}`));
    card.appendChild(meta);
    if (article.status === "draft") addText(card, "around-draft", "Draft · Preview only.");
    const excerpt = addText(card, "around-excerpt", article.excerpt || "");
    excerpt.className = "around-excerpt";
    appendContext(doc, card, article.team_context);
    if (article.score_citation) addText(card, "score-citation", article.score_citation);
    const actions = doc.createElement("p");
    actions.className = "around-actions";
    const read = doc.createElement("a");
    read.className = "btn btn-primary";
    read.href = articleHref(home, article);
    read.textContent = "Read full post";
    const share = doc.createElement("a");
    share.className = "btn";
    share.href = shareHref(article.title, absoluteArticleUrl(home, article));
    share.textContent = "Share";
    actions.append(read, share);
    card.appendChild(actions);
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
    note.className = "around-attribution";
    note.textContent = ATTRIBUTION;
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

  function attachLogoFallbacks(doc) {
    const images = doc.querySelectorAll ? doc.querySelectorAll("img.around-logo") : [];
    images.forEach((img) => {
      const name = img.getAttribute("data-team-name") || "";
      const apply = () => {
        if (img.__fallbackApplied) return;
        img.__fallbackApplied = true;
        const span = doc.createElement("span");
        span.className = "logo-fallback around-logo";
        span.textContent = initials(name);
        if (typeof img.replaceWith === "function") img.replaceWith(span);
      };
      img.addEventListener("error", apply);
      if (img.complete && img.naturalWidth === 0) apply();
    });
  }

  function mount(doc) {
    const home = homeFrom();
    state.home = home;
    state.doc = doc;
    attachLogoFallbacks(doc);
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
          banner.textContent = "Draft · Preview only.";
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
    articleDateLabel,
    contextLabel,
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
