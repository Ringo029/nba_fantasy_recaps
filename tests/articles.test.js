const test = require("node:test");
const assert = require("node:assert/strict");
const articles = require("../assets/js/articles.js");

const weekFive = [
  {
    article_id: "atl-late",
    slug: "late",
    season_id: "2026-27",
    matchup_period_id: 5,
    title: "Late <script>",
    excerpt: "Late excerpt",
    author_display_name: "Member A",
    article_type: "Midweek analysis",
    published_at: "2026-12-20T12:00:00Z",
    featured: true,
    recap_href: "seasons/2026-27/recaps/period-05.html",
  },
  {
    article_id: "atl-early",
    slug: "early",
    season_id: "2026-27",
    matchup_period_id: 5,
    title: "Early",
    published_at: "2026-11-18T12:00:00Z",
    featured: true,
    recap_href: "?season=2026-27&recap=5#recaps",
  },
  {
    article_id: "atl-four",
    slug: "four",
    season_id: "2026-27",
    matchup_period_id: 4,
    title: "Week four",
    published_at: "2026-11-19T12:00:00Z",
    featured: false,
  },
  {
    article_id: "atl-archive",
    slug: "archive",
    season_id: "2025-26",
    matchup_period_id: 5,
    title: "Archive",
    published_at: "2026-11-22T12:00:00Z",
    featured: false,
  },
];

test("week lists stay on the assigned season and week", () => {
  assert.deepEqual(
    articles.articlesForWeek(weekFive, "2026-27", 5).map((row) => row.article_id),
    ["atl-late", "atl-early"]
  );
  assert.deepEqual(articles.articlesForWeek(weekFive, "2026-27", 4).map((row) => row.article_id), ["atl-four"]);
  assert.deepEqual(articles.articlesForWeek(weekFive, "2025-26", 5).map((row) => row.article_id), ["atl-archive"]);
  assert.equal(articles.articlesForWeek(weekFive, "2025-26", 4).length, 0);
});

test("one featured article is chosen when several are marked", () => {
  assert.equal(articles.selectFeatured(weekFive).article_id, "atl-late");
  const tied = [
    { article_id: "atl-a", featured: true, published_at: "2026-11-21T12:00:00Z" },
    { article_id: "atl-b", featured: true, published_at: "2026-11-21T12:00:00Z" },
  ];
  assert.equal(articles.selectFeatured(tied).article_id, "atl-b");
  const listed = articles.listingArticles(weekFive);
  assert.equal(listed.featured.article_id, "atl-late");
  assert.ok(listed.rest.every((row) => row.article_id !== "atl-late"));
});

test("article links and share metadata stay on that article", () => {
  assert.equal(articles.parseRecapLocation("/nba_fantasy_recaps/seasons/2026-27/recaps/period-05.html").period, 5);
  assert.equal(articles.parseRecapLocation("/seasons/2025-26/recaps/week-04.html").seasonId, "2025-26");
  assert.equal(articles.parseRecapLocation("/articles/note.html"), null);
  assert.equal(articles.articleHref("/nba_fantasy_recaps/", { slug: "late" }), "/nba_fantasy_recaps/articles/late.html");
  assert.equal(articles.safeSitePath("javascript:alert(1)"), "");
  assert.equal(articles.publicationLabel(null), "");
  assert.equal(articles.articleDateLabel({ author_date: "2026-11-16" }), "Written Nov 16, 2026");
  assert.equal(articles.articleDateLabel({}), "");
  const sameTime = articles.articleDateLabel({
    author_date: "2026-11-16",
    published_at: "2026-11-21T15:00:00Z",
    updated_at: "2026-11-21T15:00:00Z",
  });
  assert.match(sameTime, /^Written Nov 16, 2026 · Published /);
  assert.equal(sameTime.includes("Updated "), false);
  const edited = articles.articleDateLabel({
    published_at: "2026-11-21T15:00:00Z",
    updated_at: "2026-11-22T18:00:00Z",
  });
  assert.match(edited, /^Published /);
  assert.match(edited, / · Updated /);
  assert.equal(
    articles.contextLabel({ wins: 2, losses: 2, ties: 0, standing_rank: 5, power_rank: 6, power_movement: "Up 1", label: "Through Week 4." }),
    "2–2 · Standing #5 · Power #6, up 1 · Through Week 4."
  );
  assert.equal(articles.contextLabel({ wins: 2, losses: 2, ties: 1, power_rank: 6, power_movement: "Down 2" }), "2–2–1 · Power #6, down 2");
  assert.equal(articles.contextLabel({ wins: 2, losses: 2, ties: 0 }), "2–2");
  assert.equal(articles.contextLabel({ label: "Week 4" }).includes("Unavailable"), false);
  assert.match(articles.weekLabel("2026-27", 5), /2026–27/);
  assert.match(articles.weekLabel("2026-27", 5), /Week 5/);
  const share = articles.shareHref("🚨 Tres matchups", "https://ringo029.github.io/nba_fantasy_recaps/articles/late.html");
  assert.match(share, /^https:\/\/wa\.me\/\?text=/);
  assert.match(share, /articles%2Flate\.html/);
});
