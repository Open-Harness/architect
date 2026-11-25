// node --test tools/github/board.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { APP_MILESTONES, boardCounts, claimOverlaps, parseBoard } from "./board.mjs";
import { page, row, sample } from "./fixtures.mjs";

test("the page's rows: every column read, the kind from the id, the name from the item, the tables outside section 2 ignored", () => {
  const { rows, errors } = parseBoard(sample);
  assert.deepEqual(errors, []);
  assert.deepEqual(rows.map((r) => r.id), ["secrets", "things", "sign-in", "reports", "gap-node-host"]);
  const secrets = rows[0];
  assert.deepEqual([secrets.kind, secrets.name, secrets.stage, secrets.pulledBy, secrets.release, secrets.milestone, secrets.lane], ["capability", "Secrets by declaration", "building", "superagent", "beta", "coding agent", "goal-17"]);
  assert.deepEqual(secrets.touches, ["packages/host-cloudflare", "packages/orthograph/src/modules/secrets"]);
  assert.equal(rows[2].name, "Sign-in (`@orthograph/auth`: people, sessions)", "a colon inside parentheses is not the end of the name");
  assert.deepEqual(rows[2].needs, ["secrets", "things"]);
  assert.equal(rows[4].kind, "gap");
  assert.deepEqual([rows[4].release, rows[4].milestone, rows[4].lane, rows[4].touches], [null, null, null, []]);
  assert.deepEqual(boardCounts(rows).byPulledBy, { superagent: 2, Capxul: 1, framework: 2 });
  assert.equal(boardCounts(rows).byStage.provisional, 3);
});

test("a row that does not read is an error naming it, never a silent skip", () => {
  const bad = (line) => parseBoard(page(line)).errors.join("\n");
  assert.match(bad(row("A_b", "x", "building", "framework", "—", "—", "none", "—", "—", "")), /id is not lowercase/);
  assert.match(bad(row("a", "x: y", "half-built", "framework", "—", "—", "none", "—", "—", "")), /stage 'half-built'/);
  assert.match(bad(row("a", "x: y", "built", "everyone", "—", "—", "none", "—", "—", "")), /pulled by 'everyone'/);
  assert.match(bad(row("a", "x: y", "built", "framework", "2.0", "—", "none", "—", "—", "")), /release '2.0'/);
  assert.match(bad(row("a", "x: y", "built", "framework", "—", "someday", "none", "—", "—", "")), /milestone 'someday'/);
  assert.match(bad(row("a", "x: y", "built", "framework", "—", "—", "team-4", "—", "—", "")), /lane 'team-4'/);
  assert.match(bad(row("a", "x: y", "built", "framework", "—", "—", "none", "packages/x", "—", "")), /touches is not a list/);
  assert.match(bad(row("a", "x: y", "built", "framework", "—", "—", "none", "—", "ghost", "")), /needs 'ghost', which is no row/);
  assert.match(bad("| a | too | few |"), /3 cells/);
  assert.match(parseBoard("# no map\n").errors[0], /no section/);
});

test("fail closed: a table in the map whose header is misspelt is an error, and the legend is the one table allowed", () => {
  const good = row("a", "x: y", "built", "framework", "—", "—", "none", "—", "—", "");
  const misspelt = page(good).replace("| Stage |", "| Stag |");
  const { errors } = parseBoard(misspelt);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /header is not the board's columns/);
  const legend = page(good).replace("Prose.", "| Column | What it holds |\n|---|---|\n| id | a name |\n\nProse.");
  assert.deepEqual(parseBoard(legend).errors, []);
  assert.equal(parseBoard(legend).rows.length, 1);
  assert.match(parseBoard(page(good).replace("Prose.", "| Colum | What |\n|---|---|\n| x | y |")).errors[0], /header is not the board's columns/);
});

test("the split and the releases: a framework row's only milestone is the alpha, and K44 decides the release", () => {
  const bad = (line) => parseBoard(page(line)).errors.join("\n");
  assert.match(bad(row("a", "x: y", "built", "framework", "—", "books", "none", "—", "—", "")), /is Capxul's, but the row is pulled by framework/);
  assert.match(bad(row("a", "x: y", "built", "superagent", "—", "books", "none", "—", "—", "")), /is Capxul's, but the row is pulled by superagent/);
  assert.match(bad(row("a", "x: y", "built", "Capxul", "1.0", "books", "none", "—", "—", "")), /for 'books' ships in beta/);
  assert.match(bad(row("a", "x: y", "built", "Capxul", "beta", "banking", "none", "—", "—", "")), /for 'banking' ships in 1.0/);
  assert.match(bad(row("a", "x: y", "built", "Capxul", "beta", "—", "none", "—", "—", "")), /off its path ships in 1.0/);
  assert.match(bad(row("a", "x: y", "built", "framework", "preview", "—", "none", "—", "—", "")), /preview piece is the alpha's/);
  assert.match(bad(row("a", "x: y", "built", "framework", "beta", "alpha", "none", "—", "—", "")), /for 'alpha' ships in preview/);
  assert.equal(bad(row("a", "x: y", "built", "framework", "preview", "alpha", "none", "—", "—", "")), "");
  assert.match(bad(row("a", "x: y", "built", "Capxul", "—", "books", "none", "—", "—", "")), /for 'books' ships in beta/, "a milestone's row names its release");
  assert.match(bad(row("a", "x: y", "built", "superagent", "1.0", "coding agent", "none", "—", "—", "")), /ships in beta/);
  assert.match(bad(row("a", "x: y", "built", "superagent", "beta", "launch", "none", "—", "—", "")), /ships in 1.0/);
  const twice = page(row("a", "x: y", "built", "framework", "—", "—", "none", "—", "—", ""), row("a", "y: z", "built", "framework", "—", "—", "none", "—", "—", ""));
  assert.match(parseBoard(twice).errors.join(), /duplicate id/);
  const circle = page(row("a", "x: y", "built", "framework", "—", "—", "none", "—", "b", ""), row("b", "y: z", "built", "framework", "—", "—", "none", "—", "a", ""));
  assert.match(parseBoard(circle).errors.join(), /run in a circle/);
});

test("the real status page reads, every id is unique, and every app milestone is used by its own app", () => {
  const { rows, errors } = parseBoard(readFileSync("docs/canon/status.md", "utf8"));
  assert.deepEqual(errors, []);
  assert.ok(rows.length > 60);
  for (const r of rows) if (r.milestone) assert.equal(APP_MILESTONES[r.milestone].app, r.pulledBy);
  // K44: the superagent is parked, so no row is its; the chain basics are the alpha's; Capxul's books pull its reports.
  const at = (id) => rows.find((r) => r.id === id);
  assert.deepEqual(rows.filter((r) => r.pulledBy === "superagent").map((r) => r.id), []);
  for (const id of ["wallets-keys", "chain-evm", "relayer-follower", "sign-in", "ortho-new"]) assert.equal(at(id).milestone, "alpha", id);
  for (const id of ["reports", "lists", "trees", "dates"]) assert.deepEqual([at(id).pulledBy, at(id).release], ["Capxul", "beta"], id);
  assert.notEqual(at("teams").pulledBy, at("companies").pulledBy, "organisations are separate (K42, call 10)");
  assert.deepEqual(claimOverlaps(rows), []);
});

test("claims: two goals on one path are named, the same goal or a finished item is not", () => {
  const mk = (id, lane, stage, ...touches) => ({ id, lane, stage, touches });
  assert.equal(claimOverlaps([mk("a", "goal-17", "building", "packages/cli"), mk("b", "goal-16", "building", "packages/cli/src")]).length, 1);
  assert.equal(claimOverlaps([mk("a", "goal-17", "building", "packages/cli"), mk("b", "goal-17", "building", "packages/cli")]).length, 0);
  assert.equal(claimOverlaps([mk("a", "goal-17", "built", "packages/cli"), mk("b", "goal-16", "building", "packages/cli")]).length, 0);
  assert.equal(claimOverlaps([mk("a", "goal-17", "building", "packages/cli"), mk("b", "goal-16", "building", "packages/cli-two")]).length, 0, "a sibling prefix is not a parent");
});

test("every Item starts with a short name and a colon, and the issue's title is the name", () => {
  const bad = (item) => parseBoard(page(row("a", item, "built", "framework", "—", "—", "none", "—", "—", ""))).errors.join();
  assert.match(bad("no name here"), /short name and a colon/);
  assert.match(bad(`${"long ".repeat(14)}name: what it is`), /short name and a colon/);
  assert.equal(bad("Short name: what it is"), "");
});
