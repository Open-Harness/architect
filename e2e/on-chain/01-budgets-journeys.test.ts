// Goal 4's done check, first line (`design/goals/04-on-chain.md`, "The done check": every `examples/budgets` journey is green in `local`, each
// operation signed by its person). Written by the checks author; a builder never edits this file (AGENTS.md, "Journeys and checks come first").
//
// WHAT IS REQUIRED. On a fresh copy of `examples/budgets`, `ortho prove --env local` runs the whole project and
// - exits 0 and writes a report that says the run passed, with no journey stopped;
// - reports exactly the journeys, steps, actors and operations the journey sources say, pinned step by step in journeys.ts (sources.ts reads the
//   sources, and a test here holds the pin to them), every step `pass`;
// - reports each journey's `cast` as the cast the journey declares, each account `eip155:<chain>:0x<40 hex>`, the addresses distinct
//   (compared lowercase) and on one chain id;
// - for every step that runs a chain operation (anything but a read): `signer: { actor, account }`, the step's actor and that cast member's own
//   account; and `tx: { hash, by }` when the journey says a transaction is sent (`receipts({ sent })`), `by` that same account, and no `tx` when
//   it says none is sent. A read is not judged for a signer;
// - leaves nothing of the copy running (prove runs in a process group of its own; the group and every descendant seen are stopped afterwards,
//   and the check asserts none is left, as stage 1's does).
// It reads prove's own report (`--report`, schemaVersion 1), never its prose. When prove cannot even load the project there is no report, and
// the failure is prove's own message, which names the journey or the compile problem. The step's `actor` and `operation`, the journey's `cast`
// and the step's `tx` are fields S-11 asks the framework to add; `name`, `verdict` and `operation` are already in the report.
//
// THE CONTROLS plant each hollow reading against `reportProblems`, starting from an honest report built from the pin: see the plants below.
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { copyOf } from "../layer1/support.ts";
import { PIN, STEPS, reportProblems, type ReportedJourney } from "./journeys.ts";
import { readJourneys } from "./sources.ts";
import { budgets, leftRunning, plain, proveOnce } from "./support.ts";

const reports = mkdtempSync(join(tmpdir(), "ortho-on-chain-"));
const copies: Array<ReturnType<typeof copyOf>> = [];
afterEach(async () => {
  const roots = copies.splice(0);
  for (const copy of roots) { const left = await leftRunning(copy.root); copy.remove(); expect(left, "something of the copy is still running").toEqual([]); }
});

describe("the journey sources and the pin agree", () => {
  it("every journey, cast, step title, actor, operation, chain-ness and sent count of examples/budgets is pinned, and nothing else", () => {
    const sources = Object.fromEntries(readJourneys().map((j) => [j.name, { cast: j.cast, steps: j.steps }]));
    expect(sources).toEqual(JSON.parse(JSON.stringify(PIN)));
    expect(STEPS).toBe(26);
  });
});

const ada = "eip155:31337:0x" + "aa".repeat(20);
const ACCOUNTS: Record<string, string> = { ada, bob: "eip155:31337:0x" + "bb".repeat(20), olga: "eip155:31337:0x" + "cc".repeat(20), reader: "eip155:31337:0x" + "dd".repeat(20), shop: "eip155:31337:0x" + "ee".repeat(20) };
const hash = (n: number) => "0x" + n.toString(16).padStart(64, "0");

/** An honest report for the pin: every step as the pin says, signed by its actor's own account, with a tx where one is sent. */
const honest = (): ReportedJourney[] => Object.entries(PIN).map(([name, pin], j) => ({
  name,
  cast: Object.fromEntries(pin.cast.map((c) => [c, { account: ACCOUNTS[c]! }])),
  steps: pin.steps.map((s, i) => ({
    name: s.name, verdict: "pass", actor: s.actor, operation: s.operation,
    ...(s.chain ? { signer: { actor: s.actor, account: ACCOUNTS[s.actor]! } } : {}),
    ...(s.chain && s.sent > 0 ? { tx: { hash: hash(j * 100 + i + 1), by: ACCOUNTS[s.actor]! } } : {}),
  })),
}));

type Edit = (j: ReportedJourney, index: number) => ReportedJourney;
/** The honest report with `edit` applied to the journey called `name` (the first journey when omitted). */
const plant = (edit: Edit, name = Object.keys(PIN)[0]!): ReportedJourney[] => honest().map((j, i) => (j.name === name ? edit(j, i) : j));
const step = (at: number, patch: object): Edit => (j) => ({ ...j, steps: j.steps.map((s, i) => (i === at ? { ...s, ...patch } : s)) });
const without = (at: number, key: string): Edit => (j) => ({ ...j, steps: j.steps.map((s, i) => { if (i !== at) return s; const { [key]: _gone, ...rest } = s as Record<string, unknown>; return rest; }) });
const castOf = (cast: Record<string, { account?: string }>): Edit => (j) => ({ ...j, cast });
const held = (name: string, report: ReadonlyArray<ReportedJourney>) => expect(reportProblems(report), name).not.toEqual([]);
const GRANT = "a Safe grants a member an allowance"; // ada (chain, sent 1) then reader (a read)
const WRONG = "a wrong signer is refused before anything is sent"; // bob (chain, sent 0) ... olga (chain, sent 1)

describe("controls: reportProblems refuses each hollow reading", () => {
  it("accepts the honest report", () => expect(reportProblems(honest())).toEqual([]));

  it("the journeys: a missing, an extra, a repeated, a renamed one; one stopped", () => {
    held("missing", honest().slice(1));
    held("extra", [...honest(), { name: "something else", steps: [] }]);
    held("repeated", [...honest(), honest()[0]!]);
    held("renamed", honest().map((j, i) => (i === 0 ? { ...j, name: "renamed" } : j)));
    held("stopped", plant((j) => ({ ...j, stopped: "the world stopped" })));
  });
  it("the steps: one short, one extra, one red, a verdict in capitals or missing, a step renamed or all named alike", () => {
    held("short", plant((j) => ({ ...j, steps: j.steps.slice(1) })));
    held("extra", plant((j) => ({ ...j, steps: [...j.steps, j.steps[0]!] })));
    held("red", plant(step(0, { verdict: "fail" })));
    held("PASS", plant(step(0, { verdict: "PASS" })));
    held("no verdict", plant(without(0, "verdict")));
    held("renamed", plant(step(0, { name: "ada does something" })));
    held("one journey green, another red", plant(step(1, { verdict: "fail" }), WRONG));
    held("all named alike", honest().map((j) => ({ ...j, steps: j.steps.map((s) => ({ ...s, name: "x" })) })));
  });
  it("the actor and the operation: the wrong actor with signer, actor and cast all agreeing; an operation renamed, off chain, or missing", () => {
    const j = plant((x) => ({ ...x, cast: { ...x.cast, bob: x.cast!["bob"]! }, steps: x.steps.map((s, i) => (i === 0 ? { ...s, actor: "ada", signer: { actor: "ada", account: ACCOUNTS["ada"] }, tx: undefined } : s)) }), WRONG);
    held("a different actor throughout (ada for bob)", j);
    held("every step by one actor", honest().map((x) => ({ ...x, steps: x.steps.map((s) => ({ ...s, actor: "ada", signer: s.signer && { actor: "ada", account: ACCOUNTS["ada"] }, tx: s.tx && { ...s.tx, by: ACCOUNTS["ada"] } })) })));
    held("an operation renamed", plant(step(0, { operation: "allowance.get" })));
    held("a chain step reported as a read", plant(step(0, { operation: "GET /health" })));
    held("an operation missing", plant(without(0, "operation")));
    held("a read reported as a chain operation", plant(step(1, { operation: "allowance.grant" }), GRANT));
  });
  it("the cast: only ada, an invented one, a name missing, a name extra, none, not an object", () => {
    held("only ada, who signs every step", honest().map((x) => ({ ...x, cast: { ada: { account: ACCOUNTS["ada"] } }, steps: x.steps.map((s) => ({ ...s, actor: "ada", signer: s.signer && { actor: "ada", account: ACCOUNTS["ada"] }, tx: s.tx && { ...s.tx, by: ACCOUNTS["ada"] } })) })));
    held("an invented cast {nobody}", plant((x) => ({ ...x, cast: { nobody: { account: ada } } }), GRANT));
    held("a name missing", plant(castOf({ ada: { account: ACCOUNTS["ada"] }, olga: { account: ACCOUNTS["olga"] } }), GRANT));
    held("a name extra", plant(castOf({ ada: { account: ACCOUNTS["ada"] }, olga: { account: ACCOUNTS["olga"] }, reader: { account: ACCOUNTS["reader"] }, zed: { account: ACCOUNTS["shop"] } }), GRANT));
    held("no cast", plant((x) => ({ ...x, cast: undefined }), GRANT));
  });
  it("the accounts: one address for all, one address in three cases, one address under three chain ids, `a`, `0x0`, empty, too short, not hex, no chain", () => {
    const three = (a: string, b: string, c: string) => castOf({ ada: { account: a }, olga: { account: b }, reader: { account: c } });
    const addr = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd";
    const retarget = (x: ReportedJourney, c: Record<string, { account?: string }>): ReportedJourney => ({ ...x, cast: c, steps: x.steps.map((s) => ({ ...s, signer: s.signer && { actor: s.actor!, account: c[s.actor!]?.account }, tx: s.tx && { ...s.tx, by: c[s.actor!]?.account } })) });
    const sameFor = (a: string, b: string, c: string) => plant((x) => retarget(x, { ada: { account: a }, olga: { account: b }, reader: { account: c } }), GRANT);
    held("one address", sameFor(`eip155:31337:${addr}`, `eip155:31337:${addr}`, `eip155:31337:${addr}`));
    held("one address in three cases", sameFor(`eip155:31337:${addr}`, `eip155:31337:${addr.toUpperCase().replace("0X", "0x")}`, "eip155:31337:0xAbCdEfAbCdEfAbCdEfAbCdEfAbCdEfAbCdEfAbCd"));
    held("one address under three chain ids", sameFor(`eip155:1:${addr}`, `eip155:31337:${addr}`, `eip155:5:${addr}`));
    held("distinct addresses under three chain ids", sameFor(`eip155:1:0x${"11".repeat(20)}`, `eip155:31337:0x${"22".repeat(20)}`, `eip155:5:0x${"33".repeat(20)}`));
    for (const bad of ["a", "0x0", "", "eip155:31337:0x0", `eip155:31337:0x${"zz".repeat(20)}`, `31337:0x${"11".repeat(20)}`, `eip155:31337:0x${"11".repeat(21)}`, `eip155::0x${"11".repeat(20)}`])
      held(`account ${JSON.stringify(bad)}`, sameFor(bad, `eip155:31337:0x${"22".repeat(20)}`, `eip155:31337:0x${"33".repeat(20)}`));
    held("the cast changed but the signer left on the old account", plant(three(`eip155:31337:0x${"11".repeat(20)}`, ACCOUNTS["olga"]!, ACCOUNTS["reader"]!), GRANT));
  });
  it("the signer: another actor's account, another actor, a right actor with a wrong account, missing, no account, an empty one", () => {
    held("another actor's account", plant(step(0, { signer: { actor: "ada", account: ACCOUNTS["olga"] } }), GRANT));
    held("another actor", plant(step(0, { signer: { actor: "olga", account: ACCOUNTS["ada"] } }), GRANT));
    held("right actor, wrong account", plant(step(0, { signer: { actor: "ada", account: "eip155:31337:0x" + "ab".repeat(20) } }), GRANT));
    held("missing", plant(without(0, "signer"), GRANT));
    held("no account", plant(step(0, { signer: { actor: "ada" } }), GRANT));
    held("an empty account", plant(step(0, { signer: { actor: "ada", account: "" } }), GRANT));
    held("a chain step that sent nothing, signer missing", plant(without(0, "signer"), WRONG));
    expect(reportProblems(plant(step(0, { signer: { actor: "ada", account: ACCOUNTS["ada"]!.toUpperCase().replace("EIP155", "eip155").replace("0X", "0x") } }), GRANT))).toEqual([]);
  });
  it("the receipt: no tx where one is sent, a tx where none is, a bad hash, `by` another's or missing; a read is not judged for a signer", () => {
    held("no tx", plant(without(0, "tx"), GRANT));
    held("a tx where none is sent", plant(step(0, { tx: { hash: hash(9), by: ACCOUNTS["bob"] } }), WRONG));
    held("a bad hash", plant(step(0, { tx: { hash: "0x1234", by: ACCOUNTS["ada"] } }), GRANT));
    held("a missing hash", plant(step(0, { tx: { by: ACCOUNTS["ada"] } }), GRANT));
    held("`by` another actor's account", plant(step(0, { tx: { hash: hash(9), by: ACCOUNTS["olga"] } }), GRANT));
    held("`by` missing", plant(step(0, { tx: { hash: hash(9) } }), GRANT));
    held("tx.by differing from signer.account", plant(step(4, { tx: { hash: hash(9), by: ACCOUNTS["bob"] } }), WRONG));
    // one transaction per step: a hash repeated within a journey, across journeys, or in another case is refused
    const TWICE = "a spend submitted twice lands once"; // two sent transactions: steps 1 and 4
    const first = honest().find((j) => j.name === TWICE)!.steps[0]!.tx!.hash!;
    held("a hash repeated within a journey", plant(step(3, { tx: { hash: first, by: ACCOUNTS["olga"] } }), TWICE));
    held("a hash repeated across journeys", plant(step(0, { tx: { hash: first, by: ACCOUNTS["ada"] } }), GRANT));
    expect(reportProblems(plant(step(3, { tx: { hash: first, by: ACCOUNTS["olga"] } }), TWICE))).toHaveLength(1);
    held("a hash repeated in another case", plant(step(0, { tx: { hash: first.toUpperCase().replace("0X", "0x"), by: ACCOUNTS["ada"] } }), GRANT));
    expect(reportProblems(plant(step(0, { tx: { hash: hash(9999), by: ACCOUNTS["ada"] } }), GRANT))).toEqual([]);
    expect(reportProblems(plant(step(1, { signer: { actor: "someone", account: "x" } }), GRANT)), "a read is not judged for a signer").toEqual([]);
  });
  it("every journey and every step is judged, not the first, and each problem names where", () => {
    const found = reportProblems(plant(without(3 - 1, "signer"), "revoke then spend"));
    expect(found).toHaveLength(1);
    expect(found[0]).toContain('journey "revoke then spend", step 3');
  });
});

describe("--env local", () => {
  it("every budgets journey is green: 7 journeys, 26 steps, each signed by its actor, read from prove's report", { timeout: 660_000 }, async () => {
    const copy = copyOf(budgets);
    copies.push(copy);
    const ended = await proveOnce(copy.root, ["--env", "local"], { hardStopSeconds: 600, report: join(reports, "local.json") });
    const out = plain(ended.out);
    expect(ended.hung, "prove still running at the hard stop").toBe(false);
    expect(ended.report, `ortho prove could not run examples/budgets in local (exit ${ended.status}); prove said:\n${out.slice(-3000)}`).toBeDefined();
    const report = ended.report as { schemaVersion: number; passed: boolean; totals: Record<string, number>; journeys: ReportedJourney[] };
    expect(report.schemaVersion).toBe(1);
    const problems = [
      ...reportProblems(report.journeys),
      ...(report.totals["journeys"] === Object.keys(PIN).length && report.totals["steps"] === STEPS ? [] : [`totals say ${report.totals["journeys"]} journeys, ${report.totals["steps"]} steps; expected ${Object.keys(PIN).length}, ${STEPS}`]),
      ...(report.totals["stepsPassed"] === STEPS && report.totals["journeysPassed"] === Object.keys(PIN).length ? [] : [`${report.totals["stepsPassed"]} steps and ${report.totals["journeysPassed"]} journeys passed`]),
      ...(report.passed ? [] : ["the report says the run did not pass"]),
      ...(ended.status === 0 ? [] : [`exit status ${ended.status}`]),
    ];
    expect(problems, `${problems.join("\n")}\n--- prove said (tail):\n${out.slice(-2500)}`).toEqual([]);
    console.log(`local: ${report.totals["stepsPassed"]}/${report.totals["steps"]} steps, ${ended.seconds.toFixed(1)} s`);
  });
});
