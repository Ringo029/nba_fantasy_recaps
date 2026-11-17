const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const page = fs.readFileSync(path.join(__dirname, "..", "team_insights.html"), "utf8");

test("season trends stay hidden until the export has lines", () => {
  assert.match(page, /id="trends-card" hidden/);
  assert.match(page, /<h2>Season trends<\/h2>/);
  assert.match(page, /scoring_rank_line/);
  assert.match(page, /average_line/);
  assert.match(page, /streak_line/);
  assert.match(page, /upcoming_line/);
  assert.match(page, /trendsCard\.hidden = trendLines\.length === 0/);
  assert.match(page, /Average opponent power rank is the mean power rank/);
  assert.match(page, /Lower means stronger/);
  assert.match(page, /A missing matchup or a tie ends it/);
  assert.doesNotMatch(page, /unlucky/);
});
