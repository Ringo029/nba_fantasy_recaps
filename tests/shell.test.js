const test = require("node:test");
const assert = require("node:assert/strict");
const shell = require("../assets/js/shell.js");

test("home links resolve at the site root and under nested recaps", () => {
  assert.equal(shell.homeHref("/nba_fantasy_recaps/"), "/nba_fantasy_recaps/");
  assert.equal(shell.homeHref("/nba_fantasy_recaps/index.html"), "/nba_fantasy_recaps/");
  assert.equal(shell.homeHref("/nba_fantasy_recaps/team_insights.html"), "/nba_fantasy_recaps/");
  assert.equal(
    shell.homeHref("/nba_fantasy_recaps/seasons/2026-27/recaps/period-04.html"),
    "/nba_fantasy_recaps/"
  );
  assert.equal(shell.homeHref("/nba_fantasy_recaps/recaps/week-16.html"), "/nba_fantasy_recaps/");
  assert.equal(shell.homeHref("/seasons/2026-27/recaps/period-04.html"), "/");
  assert.equal(
    shell.homeHref("/C:/Users/chris/OneDrive/Documents/nba_fantasy_recaps/seasons/2026-27/recaps/period-04.html"),
    "../../../"
  );
});

test("article pages keep home and week links and are not treated as home", () => {
  assert.equal(shell.pageKind("/nba_fantasy_recaps/articles/note.html"), "around");
  assert.equal(shell.pageKind("/nba_fantasy_recaps/seasons/2026-27/recaps/period-05.html"), "recaps");
  assert.equal(shell.pageKind("/nba_fantasy_recaps/"), "home");
  assert.equal(shell.aroundHref("/nba_fantasy_recaps/articles/note.html"), "/nba_fantasy_recaps/articles/index.html");
  assert.equal(shell.sectionHref("/nba_fantasy_recaps/articles/note.html", "recaps"), "/nba_fantasy_recaps/#recaps");
  assert.equal(
    shell.homeHref("/C:/Users/chris/OneDrive/Documents/nba_fantasy_recaps/articles/note.html"),
    "../"
  );
  assert.equal(
    shell.aroundHref("/C:/Users/chris/OneDrive/Documents/nba_fantasy_recaps/seasons/2026-27/recaps/period-05.html"),
    "../../../articles/index.html"
  );
});

test("recap navigation targets the overview and the archive separately", () => {
  assert.equal(shell.sectionHref("/nba_fantasy_recaps/", "recaps"), "/nba_fantasy_recaps/#recaps");
  assert.equal(shell.sectionHref("/nba_fantasy_recaps/team_insights.html", "recaps"), "/nba_fantasy_recaps/#recaps");
  assert.equal(
    shell.sectionHref("/nba_fantasy_recaps/seasons/2026-27/recaps/period-04.html", "all-recaps"),
    "/nba_fantasy_recaps/#all-recaps"
  );
  assert.equal(shell.sectionHref("/nba_fantasy_recaps/recaps/week-02.html", "recaps"), "/nba_fantasy_recaps/#recaps");
  assert.equal(shell.sectionHref("/", "standings"), "/#standings");
});

test("my team keeps the saved id and season", () => {
  assert.equal(
    shell.myTeamHref("/nba_fantasy_recaps/seasons/2026-27/recaps/period-04.html", { season: "2026-27", teamId: "25" }),
    "/nba_fantasy_recaps/team_insights.html?season=2026-27&team_id=25"
  );
  assert.equal(
    shell.myTeamHref("/seasons/2025-26/recaps/week-16.html", { season: "2025-26", teamId: "9" }),
    "/team_insights.html?season=2025-26&team_id=9"
  );
});

test("member labels keep zeros and move known notes out of the primary warning", () => {
  assert.equal(shell.updatedLabel("2026-11-16T18:40:05Z", "America/New_York"), "Updated Nov 16, 1:40 PM EST");
  assert.equal(shell.asOfLabel("2026-11-16T18:40:04Z", "America/New_York"), "Roster as of Nov 16, 1:40 PM EST");
  assert.equal(shell.weekHeading(5, "2026-11-16", "2026-11-22", "America/New_York"), "Week 5 · Nov 16–22");
  assert.equal(shell.periodBadge("final"), "Final");
  assert.equal(shell.periodBadge("provisional"), "This week");
  assert.equal(shell.recapTitle(true), "Latest completed recap");
  assert.equal(shell.recapTitle(false), "Selected recap");
  assert.equal(shell.leagueName(""), "THE LEAGUE");
  assert.equal(shell.leagueName("League"), "THE LEAGUE");
  assert.equal(shell.leagueName("THE LEAGUE"), "THE LEAGUE");
  const notes = shell.memberWarnings([
    "Win probabilities are not published.",
    "Null values stay Unavailable.",
    "The roster file could not be loaded.",
  ]);
  assert.deepEqual(notes.primary, ["The roster file could not be loaded."]);
  assert.match(notes.about.join(" "), /Win probabilities are not published/);
});
