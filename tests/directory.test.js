const test = require("node:test");
const assert = require("node:assert/strict");
const directory = require("../assets/js/directory.js");

function fakeDocument() {
  function element(tag) {
    return {
      tag,
      attrs: {},
      children: [],
      listeners: {},
      className: "",
      textContent: "",
      alt: "",
      src: "",
      setAttribute(key, value) { this.attrs[key] = value; },
      getAttribute(key) { return this.attrs[key]; },
      appendChild(child) { this.children.push(child); return child; },
      addEventListener(name, fn) { this.listeners[name] = fn; },
      replaceWith(next) { this.replacedWith = next; },
    };
  }
  return { createElement: element };
}

test("logo elements come from the selected season directory", () => {
  const teams = directory.indexByTeamId([
    { team_id: 16, team_name: "El TumbaCuello", logo_url: "https://g.espncdn.com/logo.svg" },
    { team_id: 25, team_name: "Ringo", logo_url: "" },
  ], "2026-27");
  const doc = fakeDocument();
  const known = directory.logoElement(directory.profileFor(teams, 16).logo_url, "El TumbaCuello", doc);
  assert.equal(known.tag, "img");
  assert.equal(known.src, "https://g.espncdn.com/logo.svg");
  assert.equal(known.alt, "El TumbaCuello logo");
  const missing = directory.logoElement(directory.profileFor(teams, 25).logo_url, "Ringo", doc);
  assert.equal(missing.tag, "span");
  assert.equal(missing.textContent, "R");
  assert.equal(missing.attrs["aria-label"], "Ringo logo");
});

test("a failed image is replaced by an initials fallback", () => {
  const doc = fakeDocument();
  const img = directory.logoElement("https://cdn.example/missing.png", "Las Villas", doc);
  img.listeners.error();
  assert.equal(img.replacedWith.tag, "span");
  assert.equal(img.replacedWith.textContent, "LV");
  assert.equal(img.replacedWith.attrs.role, "img");
});

test("only https and local image URLs are accepted", () => {
  assert.equal(directory.approvedImageUrl("https://i.imgur.com/rDV46Wu.jpg"), "https://i.imgur.com/rDV46Wu.jpg");
  assert.equal(directory.approvedImageUrl("http://localhost/logo.png"), "http://localhost/logo.png");
  assert.equal(directory.approvedImageUrl("/assets/logo.png"), "/assets/logo.png");
  assert.equal(directory.approvedImageUrl("http://example.com/logo.png"), "");
  assert.equal(directory.approvedImageUrl("javascript:alert(1)"), "");
  assert.equal(directory.approvedImageUrl("data:image/svg+xml,x"), "");
});

test("power movement keeps its published direction", () => {
  assert.equal(directory.movementText("Up 4"), "Up 4");
  assert.equal(directory.movementClass("Up 4"), "power-movement movement-up");
  assert.equal(directory.movementClass("Down 3"), "power-movement movement-down");
  assert.equal(directory.movementClass("Unchanged"), "power-movement");
});

test("team selection prefers the URL, then the saved id", () => {
  const ids = [16, 25, 3];
  assert.equal(directory.chosenTeamId("25", "16", ids), "25");
  assert.equal(directory.chosenTeamId("", "16", ids), "16");
  assert.equal(directory.chosenTeamId("99", "16", ids), "16");
  assert.equal(directory.chosenTeamId("", "", ids), "16");
});

test("one unavailable metric does not hide an available section", () => {
  const shown = directory.sectionVisibility({
    categories: false,
    projection: false,
    roster: true,
    opponent: true,
    watchlist: true,
    history: true,
  });
  assert.equal(shown.projection, false);
  assert.equal(shown.categories, false);
  assert.equal(shown.roster, true);
  assert.equal(shown.opponent, true);
  assert.equal(shown.watchlist, true);
  assert.equal(shown.history, true);
});

test("a late response from another season cannot replace the directory", () => {
  const current = directory.indexByTeamId([{ team_id: 16, logo_url: "https://cdn.example/new.svg" }], "2026-27");
  const stale = directory.indexByTeamId([{ team_id: 16, logo_url: "https://cdn.example/old.svg" }], "2025-26");
  assert.equal(directory.acceptDirectory(1, 2, stale), null);
  assert.equal(directory.acceptDirectory(2, 2, current).seasonId, "2026-27");
  assert.equal(directory.dataSources("2026-27").archiveDirectory, null);
  assert.equal(directory.dataSources("2025-26").teams, null);
  assert.equal(directory.dataSources("2025-26").archiveDirectory, "data/league_metadata.json");
});

test("completed results stay on the requested season and team id", () => {
  const results = [
    {
      season_id: "2026-27",
      period_id: 1,
      status: "final",
      results: [{ home_team_id: 16, away_team_id: 3, home_team_name: "El TumbaCuello", away_team_name: "Morovis", home_score: 703, away_score: 494 }],
    },
    {
      season_id: "2025-26",
      period_id: 1,
      status: "final",
      results: [{ home_team_id: 16, away_team_id: 3, home_team_name: "Old", away_team_name: "Other", home_score: 1, away_score: 2 }],
    },
  ];
  const live = directory.completedLines(results.filter((row) => row.season_id === "2026-27"), 16);
  assert.equal(live.length, 1);
  assert.equal(live[0].points, 703);
  assert.equal(live[0].opponent_points, 494);
  const opponent = directory.opponentInMatchup([
    { home_team_id: 16, away_team_id: 9, home_team_name: "El TumbaCuello", away_team_name: "La Guillotina" },
  ], 16);
  assert.equal(opponent.team_id, 9);
});
