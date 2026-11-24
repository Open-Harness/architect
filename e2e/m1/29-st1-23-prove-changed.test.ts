// Check 29 (ST1.23, Goal 3): `ortho prove --changed` proves only the journeys a change touches, names every journey it skipped, and
// proves everything, saying why, when it cannot tell. A miss is a false green, so this check is the point of the slice.
// Written by the checks author from `design/research/speed-and-vitest-proposal.md` (A2, B1); a builder never edits this file or
// `prove-speed.ts` (AGENTS.md, "Journeys and checks come first"). The choice of surface is `design/decisions/ST1-23-prove-changed.md`.
//
// THE SURFACE THE CHECK EXPECTS (the builder's brief)
//   ortho prove --changed [--report <file>] [--json] [--root <dir>]      (--env local only, like --only)
//   Base: the record of the last proof, `.ortho/evidence/proven.json`, which prove already writes. No git, no ref. The record must
//   also be able to tell, on the next run, which files changed since it was made: it keeps a content hash of every file of the
//   project that can change a proof (blueprint/, src/, journeys/, generated/, ortho.config.ts, package.json), by relative path, so a
//   record made in one folder holds in a copy of it (CI cache, this check). The model's own hashes already place three of them:
//   `operations.<op>.hash` (the declaration), `journeys.<file>.sourceHash`, `startingWorlds.<name>.sourceHash`, and prove's
//   `handlerHashes` the handler.
//   Rerun, exactly: a journey whose own file changed; a journey (through its steps or the starting worlds it stands on, oldest first)
//   that calls an operation whose handler, declaration or last verdict (failed, never proven) changed; a journey whose starting world
//   changed. Nothing else.
//   A file of a mounted package (a plugin or adapter under node_modules, or linked) that an operation's steps reach counts as a change to
//   that mount's operations: the journeys that call them rerun. Journeys are keyed by their file, not their name: two files that
//   declare one name are two journeys, a change to one reruns that one, and the other is named skipped (the name is then in both lists).
//   A handler may import from another operation's handler (a value it exports): a change to the imported file reruns the importer's
//   journeys too, or proves everything. A change to a generated file (`generated/` is hashed) cannot be placed: it proves everything,
//   names the file and never ends green with 0 journeys.
//   Cannot tell: a changed, added or removed file that is none of those (ortho.config.ts, package.json, a helper in src/ no handler
//   is known to import, any new file) or no record at all. Then it proves every journey and says why.
//   Says, in text (stdout):
//     prove --changed: proving <n> of <total> journeys               (it can tell; n may be 0)
//     journey <name> skipped: nothing it calls changed               (one line per skipped journey, the name as `Blueprint.journey` gives it)
//     prove --changed: proving all <total> journeys: <why>           (it cannot tell; <why> matches /cannot place/ and names each such file
//                                                                      by its path from the project root, or is "no record of an earlier prove")
//   and in the report (--report, --json), beside the existing fields (`journeys` holds only the journeys it ran), a new section
//     "changed": { "base": "last proof", "rerun": [<names>], "skipped": [<names>], "fellBack": null | { "reason": <why>, "files": [<paths>] } }
//   It judges again the evals of each operation whose handler or declaration changed, with the summary line prove prints for them
//   (`<operation> 9 evals ✔ ...` or `<operation> n of 9 evals ✘ ...`) and the failing eval's own line (`allowance.grant explainability ✘ ...`),
//   and reports each journey step by step with each step's verdict agreeing with its journey's.
//   Exit and verdict: 0 and `passed` when every journey it ran passed and the evals it judges pass (what it skipped keeps its recorded
//   verdicts, which stand until what they rest on changes). 1 otherwise. After a run it records what it ran: a pass is recorded as
//   proven, a failure is not (the next --changed reruns it), and what it skipped keeps its record, so a second --changed straight
//   after, with nothing changed, runs 0 of the journeys and exits 0.
//
// HOW IT IS JUDGED. Each row plants one change in a copy of acme, seeded with the record a full prove made in an earlier copy, then
// asserts the EXACT set of journeys rerun and the exact set named skipped, against sets worked out from `generated/model/model.json`
// (`calling`, `standingOn`), never from prove's output: a comment in a handler (spend, grant, revoke), a number in a read's
// declaration, a sentence in an operation's, a comment in a journey, a comment in a starting world (one that another is made
// from too), and, for a file the map cannot place, a line in the config, package.json, the lockfile, tsconfig.json or an env file, a new helper, and an existing helper
// edited and deleted. A change only an eval reads (the log that says why grant refused) passes every journey and fails an eval. Comments differ in their words every time, so nothing can be keyed on them. Two changes at once are the
// union; a placeable change beside one it cannot place falls back; a second run straight after a rerun runs none; a failing change
// is rerun until it passes. Besides prove's own report, each run is judged from what it recorded elsewhere: every journey is
// reported step by step as the model declares them, the ones that fail are the ones that must, and the operations the collector
// heard (`.ortho/prove-telemetry`, which prove empties at the start of a run) are within what the journeys it ran call and
// include everything their starting worlds make. A prove that runs everything fails each row but the fall-backs; one that runs
// nothing fails each row that has a journey to rerun; one that is one journey off, or the right count of the wrong ones, fails the
// same way; the controls plant each of those into the judge (and the world run for a skipped journey, the steps left out, a journey
// that fails where it should pass).
//
// Not planted here, and left to the builder's own tests and the review: a second project.
//
// Red today on one reason only: `--changed` is an unrecognized flag, a usage error (exit 1, "Unrecognized flag: --changed in command
// ortho prove"), so no report is written. Controls, true today: the full prove and the record it writes; the sets, from the model; the
// planted failure is real; the judge accepting a right run and refusing every wrong one; a record made in one folder holding in
// another (`ortho impact`: stale none); each plant seen by `ortho impact` (a handler, a declaration) or, for a journey (its `sourceHash` is the model's), the
// map cannot place, not seen by it. No Docker. Each row starts workerd worlds of its own through prove, on ports from the OS.
import { readFileSync, existsSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { acme, copyOf, echoJourneyTitle, mountEcho, nothingRunning, project, run, succeeds, type Copy } from "./support.ts";
import { append, calling, edit, journeyNames, modelOf, perfect, problems, prove, standingOn, stepsShortfall, worldCallsOf, type Expected, type JourneyMap, type Proved } from "./prove-speed.ts";

const RECORD = ".ortho/evidence/proven.json";
const SPEND = "src/allowance/spend.ts";
const GRANT = "src/allowance/grant.ts";
const GET = "blueprint/things/allowance/verbs/get.ts";
const REVOKE = "blueprint/things/allowance/verbs/revoke.ts";
const JOURNEY = "journeys/outsider-cannot-revoke.ts";
const CONFIG = "ortho.config.ts";
const HELPER = "src/allowance/format.ts";
/** A helper no handler imports, in every copy and in the record: edited and deleted below. HELPER is the one that is new. */
const MONEY = "src/allowance/money.ts";
const MONEY_SOURCE = "export const money = (n: bigint) => `${n}`;\n";
const PACKAGE = "package.json";
/** Files outside blueprint/, src/ and journeys/ that can change a proof, in every copy and in the record: any change to one proves everything. */
const LOCK = "pnpm-lock.yaml";
const TSCONFIG = "tsconfig.json";
const ENV = ".env";
const OTHER_FILES: Readonly<Record<string, string>> = { [LOCK]: "lockfileVersion: '9.0'\n", [ENV]: "# a note, no value\n" };
const WORLD = "blueprint/starting-worlds";
const REVOKE_HANDLER = "src/allowance/revoke.ts";

const SPEND_JOURNEYS = ["revoke then spend", "spend twice with one request", "spend within an allowance"];
const FAILING = ["spend twice with one request", "spend within an allowance"];
const GRANT_JOURNEYS = ["grant an allowance", "an outsider cannot revoke", "read an allowance", "revoke then spend", "spend twice with one request", "spend within an allowance"];

const copies: Array<ReturnType<typeof copyOf>> = [];
// Rows run together, so a copy is removed when the file is done, never by one row's hook (it would remove another row's folder).
afterAll(() => { for (const copy of copies.splice(0)) copy.remove(); });
let baseline: ReturnType<typeof copyOf>;
let map: JourneyMap;
let all: ReadonlyArray<string>;
let record: string;
let first: Proved;
afterAll(() => baseline?.remove());

/** A copy of acme holding the record the full prove made in the baseline copy (a CI cache restored, a folder moved). */
const seeded = (withRecord = true) => {
  const copy = copyOf(acme);
  copies.push(copy);
  writeFileSync(join(copy.root, MONEY), MONEY_SOURCE);
  for (const [file, text] of Object.entries(OTHER_FILES)) writeFileSync(join(copy.root, file), text);
  if (withRecord) {
    mkdirSync(dirname(join(copy.root, RECORD)), { recursive: true });
    writeFileSync(join(copy.root, RECORD), record);
  }
  return copy.root;
};
/** A comment changes a file's bytes, not what it does; its words differ each time, so nothing can be keyed on them. */
const note = () => `\n// planted ${Math.random().toString(36).slice(2)}: a comment changes the bytes, not what the code does\n`;
const plantHandler = (root: string) => append(root, SPEND, note());
const plantGrant = (root: string) => append(root, GRANT, note());
const plantRead = (root: string) => edit(root, GET, (t) => t.replace('"50 millis"', '"60 millis"'));
const plantOperation = (root: string) => edit(root, REVOKE, (t) => t.replace("Nothing more can be spent from it.", "Nothing more can be spent from it, ever."));
const plantJourney = (root: string) => append(root, JOURNEY, note());
/** The one log line that says why `grant` refused a limit over the cap: no journey reads logs, the explainability eval does. */
const dropDecidingLog = (root: string) => edit(root, GRANT, (t) => t.replace(/^\s*yield\* Effect\.logInfo\("the limit is over.*\n/m, ""));
const breakSpend = (root: string) => edit(root, SPEND, (t) => t.replace("return { remaining: remaining - amount }", "return { remaining }"));

const expecting = (ran: ReadonlyArray<string>, over: Partial<Expected> = {}): Expected => ({ ran, fellBackOn: null, all, map, passes: true, ...over });
const judged = (proved: Proved, want: Expected) => expect(problems(proved, want), `${proved.out.slice(-300)}`).toEqual([]);

const setupAcme = async () => {
  baseline = copyOf(acme);
  writeFileSync(join(baseline.root, MONEY), MONEY_SOURCE);
  for (const [file, text] of Object.entries(OTHER_FILES)) writeFileSync(join(baseline.root, file), text);
  first = await prove(baseline.root);
  map = modelOf(baseline.root);
  all = journeyNames(map);
  record = existsSync(join(baseline.root, RECORD)) ? readFileSync(join(baseline.root, RECORD), "utf8") : "";
};
// The four baselines (acme here; the plugin project, the twin project and the importer project in the describes below, which add
// theirs to `setups` as they are read) are each a full prove in a copy of their own and share nothing, so they are made together;
// `prove` lets at most PROVE_AT_ONCE run at a time (prove-speed.ts). Every row below starts from its own copy and its own world, so
// the rows of a describe run together too (`describe.concurrent`), under the same limit; a row's own proves still run one after
// another, in the order it asserts them.
const setups: Array<() => Promise<void>> = [];
beforeAll(async () => { await Promise.all([setupAcme(), ...setups.map((setup) => setup())]); }, 900_000);

describe.concurrent("29 controls: the instruments, and what today's prove already does", () => {
  it("the full prove passes on acme's 15 journeys and leaves the record every row starts from", () => {
    expect(first.status, first.out.slice(-800)).toBe(0);
    expect(first.report?.journeys.map((j) => j.name).sort()).toEqual([...all]);
    expect(all).toHaveLength(15);
    expect(JSON.parse(record).proven["allowance.spend"]).toBeDefined();
    nothingRunning(baseline.root);
  });

  it("the full prove's spans satisfy the steps rule: each operation is heard at least as often as the steps of the journeys that reach its handler", () => {
    expect(stepsShortfall(map, all, first.counts)).toEqual([]);
    expect(first.counts.get("allowance.revoke"), "revoke then spend's refused spend and the two refused revokes leave only one").toBe(1);
  });

  it("an eval-only plant is real: a full prove passes every journey and fails grant's explainability alone", async () => {
    const root = seeded(false);
    dropDecidingLog(root);
    const full = await prove(root);
    expect(full.report!.journeys.filter((j) => j.verdict !== "pass")).toEqual([]);
    expect(full.status).toBe(1);
    expect(full.out.match(/^allowance\.\S+ \S+ ✘.*$/gm)?.filter((l) => !l.includes(" coverage ") && !l.includes(" evals ")).map((l) => l.split(" ").slice(0, 3).join(" "))).toEqual(["allowance.grant explainability ✘"]);
    nothingRunning(root);
  });

  it("the sets come from the model: spend is called by 3 journeys, grant by 6 (five stand on `funded`), get by 2, revoke by 2", () => {
    expect(calling(map, "allowance.spend")).toEqual(SPEND_JOURNEYS);
    expect(calling(map, "allowance.grant")).toEqual([...GRANT_JOURNEYS].sort());
    expect(calling(map, "allowance.get")).toEqual(["read an allowance", "spend twice with one request"]);
    expect(calling(map, "allowance.revoke")).toEqual(["an outsider cannot revoke", "revoke then spend"]);
    expect(all.filter((name) => !SPEND_JOURNEYS.includes(name))).toHaveLength(12);
  });

  it("a break planted in spend.ts fails exactly 2 of the 3 journeys that call spend, on a full prove: the planted failure is real", async () => {
    const root = seeded(false);
    breakSpend(root);
    const full = await prove(root);
    expect(full.status, full.out.slice(-300)).toBe(1);
    expect(full.report!.journeys.filter((j) => j.verdict !== "pass").map((j) => j.name).sort()).toEqual(FAILING);
    nothingRunning(root);
  });

  it("the judge accepts a right run, and refuses each way of being wrong: everything, nothing, one more, one fewer, the right count of the wrong ones", () => {
    const rows: ReadonlyArray<readonly [string, Expected]> = [
      ["spend", expecting(SPEND_JOURNEYS)],
      ["none", expecting([])],
      ["fall back, a file", expecting(all, { fellBackOn: [CONFIG] })],
      ["fall back, no record", expecting(all, { fellBackOn: [], reason: /no record of an earlier prove/ })],
      ["a failing run", expecting(SPEND_JOURNEYS, { passes: false, fails: FAILING })],
      ["spend, evals judged", expecting(SPEND_JOURNEYS, { judges: ["allowance.spend"] })],
      ["an eval alone fails", expecting(calling(map, "allowance.grant"), { passes: false, fails: [], judges: ["allowance.grant"], evalFails: ["allowance.grant explainability ✘"] })],
    ];
    for (const [row, want] of rows) {
      const right = perfect(want);
      expect(problems(right, want), row).toEqual([]);
      const wrong = (name: string, edited: Pick<Proved, "status" | "out" | "report" | "called" | "counts">, expected = want) => expect(problems(edited, expected), `${row}: ${name}`).not.toEqual([]);
      const swap = (names: ReadonlyArray<string>) => ({ ...right, report: { ...right.report, journeys: names.map((n) => ({ name: n, verdict: "pass", steps: [] })) } });
      if (want.fellBackOn === null) {
        wrong("runs everything", swap(all));
        const another = all.find((n) => !want.ran.includes(n))!;
        wrong("one journey more", swap([...want.ran, another]));
        if (want.ran.length > 0) wrong("one journey fewer", swap(want.ran.slice(1)));
        if (want.ran.length > 0) wrong("the right count, the wrong ones", swap([...want.ran.slice(1), another]));
        if (want.ran.length > 0) wrong("runs nothing", swap([]));
        wrong("a repeated journey", swap([...want.ran, want.ran[0] ?? another]));
        wrong("a skipped journey not named", { ...right, out: right.out.replace(/^journey .* skipped.*\n/m, "") });
        wrong("a journey named skipped that ran", { ...right, out: `${right.out}\njourney ${want.ran[0] ?? all[0]} skipped: nothing it calls changed` });
        wrong("the record says it fell back", { ...right, report: { ...right.report, changed: { ...right.report.changed, fellBack: { reason: "cannot place x", files: ["x"] } } } });
        wrong("the world ran an operation only a skipped journey calls", { ...right, called: new Set([...right.called, "session.sign-in"]) });
        if (want.ran.length > 0) wrong("the world was never asked to run what the starting worlds make", { ...right, called: new Set() });
        wrong("the headline counts wrong", { ...right, out: right.out.replace(/proving \d+ of/, "proving 99 of") });
      } else {
        wrong("the world was never asked to run what the starting worlds make", { ...right, called: new Set() });
        wrong("it did not say it fell back", { ...right, report: { ...right.report, changed: { ...right.report.changed, fellBack: null } } });
        wrong("it ran only some", swap(all.slice(1)));
        wrong("no reason", { ...right, report: { ...right.report, changed: { ...right.report.changed, fellBack: { reason: "", files: [...want.fellBackOn] } } } });
        wrong("the file is not named", { ...right, report: { ...right.report, changed: { ...right.report.changed, fellBack: { reason: right.report.changed.fellBack!.reason, files: ["some/other/file.ts"] } } } });
        wrong("it skipped some as well", { ...right, out: `${right.out}\njourney ${all[0]} skipped: nothing it calls changed` });
      }
      if (want.ran.length > 0) {
        const first = right.report.journeys[0]!;
        const withFirst = (journey: typeof first) => ({ ...right, report: { ...right.report, journeys: [journey, ...right.report.journeys.slice(1)] } });
        wrong("a journey reported with no steps", withFirst({ ...first, steps: [] }));
        wrong("a step's verdict wrong where its journey's is right", withFirst({ ...first, steps: first.steps.map((st, i) => (i === 0 ? { ...st, verdict: st.verdict === "pass" ? "fail" : "pass" } : st)) }));
        wrong("a journey reported with another's steps", withFirst({ ...first, steps: [{ name: "a step", verdict: first.verdict }] }));
        wrong("a journey that fails where it should pass, or passes where it should fail", withFirst({ ...first, verdict: first.verdict === "pass" ? "fail" : "pass" }));
      }
      if (want.ran.length > 0 && (want.passes || want.fails?.length === 0)) wrong("journeys reported that the collector never heard run (the spans of their steps are missing)", { ...right, counts: new Map() });
      if (want.ran.length > 0 && (want.passes || want.fails?.length === 0)) {
        const setupOnly = new Map(want.ran.flatMap((name) => [...worldCallsOf(map, name)]).map((op) => [op, 1] as const));
        wrong("a collector that holds only the starting worlds' setup calls", { ...right, counts: setupOnly, called: new Set(setupOnly.keys()) });
      }
      for (const op of want.judges ?? []) wrong(`${op}'s evals not judged again`, { ...right, out: right.out.split("\n").filter((l) => !l.startsWith(`${op} `)).join("\n") });
      for (const line of want.evalFails ?? []) wrong(`no line for "${line}"`, { ...right, out: right.out.replace(line, "x") });
      wrong("a wrong exit status", { ...right, status: want.passes ? 1 : 0 });
      wrong("passed says otherwise", { ...right, report: { ...right.report, passed: !want.passes } });
      wrong("the journeys ran but the report is not there", { ...right, report: undefined });
    }
  });

  it("a record made in one folder holds in a copy of it: `ortho impact` says stale none", () => {
    const root = seeded();
    const impact = run(root, "impact");
    expect(impact.status, impact.out).toBe(0);
    expect(impact.out).toMatch(/^stale none$/m);
  });

  it("each planted change is a real one: today's `ortho impact` sees the handler, the declarations and the journey; it cannot see the config or a new helper", () => {
    const stale = (plant: (root: string) => void) => {
      const root = seeded();
      plant(root);
      return run(root, "impact").out.match(/^stale (.*)$/m)?.[1];
    };
    expect(stale(plantHandler)).toBe("allowance.spend");
    expect(stale(plantGrant)).toBe("allowance.grant");
    expect(stale(plantRead)).toBe("allowance.get");
    expect(stale(plantOperation)).toBe("allowance.revoke");
    expect(stale(plantJourney)).not.toBe("none");
    expect(stale((root) => append(root, CONFIG, "\n// planted\n"))).toBe("none");
    for (const file of [LOCK, TSCONFIG, ENV]) expect(stale((root) => append(root, file, "\n")), file).toBe("none");
    expect(stale((root) => writeFileSync(join(root, HELPER), "export const format = (n: bigint) => `${n}`;\n"))).toBe("none");
  });

  it("today's `--only` answers exactly the one journey it is given, as the instrument reads it (a rerun set can be read)", async () => {
    const root = seeded();
    const only = await prove(root, "--only", "health is up");
    expect(only.report?.journeys.map((j) => j.name)).toEqual(["health is up"]);
    nothingRunning(root);
  });
});

describe.concurrent("29 ST1.23: ortho prove --changed proves what a change touches, names what it skipped, and falls back to everything when it cannot tell", () => {
  it("with no record of an earlier proof it proves all 15 journeys and says there is no record", async () => {
    const root = seeded(false);
    const proved = await prove(root, "--changed");
    judged(proved, expecting(all, { fellBackOn: [], reason: /no record of an earlier prove/ }));
    nothingRunning(root);
  });

  it("a change to spend.ts proves the 3 journeys that call spend and names the 12 it skipped", async () => {
    const root = seeded();
    plantHandler(root);
    const proved = await prove(root, "--changed");
    judged(proved, expecting(SPEND_JOURNEYS, { judges: ["allowance.spend"] }));
    expect(proved.report?.changed?.skipped).toHaveLength(12);
    nothingRunning(root);
  });

  it("a change to grant.ts proves the 6 journeys that call grant, the five that stand on `funded` included", async () => {
    const root = seeded();
    plantGrant(root);
    const proved = await prove(root, "--changed");
    judged(proved, expecting(calling(map, "allowance.grant"), { judges: ["allowance.grant"] }));
    expect(proved.report?.changed?.rerun).toHaveLength(6);
    nothingRunning(root);
  });

  it("a changed declaration of a read (get's budget, a read has no handler) proves the 2 journeys that read it", async () => {
    const root = seeded();
    plantRead(root);
    const proved = await prove(root, "--changed");
    judged(proved, expecting(["read an allowance", "spend twice with one request"], { judges: ["allowance.get"] }));
    nothingRunning(root);
  });

  it("a changed declaration of an operation (revoke's description) proves the 2 journeys that call revoke", async () => {
    const root = seeded();
    plantOperation(root);
    const proved = await prove(root, "--changed");
    judged(proved, expecting(["an outsider cannot revoke", "revoke then spend"], { judges: ["allowance.revoke"] }));
    nothingRunning(root);
  });

  it("a changed journey proves that journey and no other, though it calls operations other journeys call", async () => {
    const root = seeded();
    plantJourney(root);
    const proved = await prove(root, "--changed");
    judged(proved, expecting(["an outsider cannot revoke"]));
    nothingRunning(root);
  });

  it("a changed config (a file the map cannot place) proves all 15 and names ortho.config.ts", async () => {
    const root = seeded();
    append(root, CONFIG, "\n// planted: nothing in the model says which journeys this file touches\n");
    const proved = await prove(root, "--changed");
    judged(proved, expecting(all, { fellBackOn: [CONFIG] }));
    nothingRunning(root);
  });

  it("a new helper file under src/ (a file the map cannot place) proves all 15 and names it", async () => {
    const root = seeded();
    writeFileSync(join(root, HELPER), "export const format = (n: bigint) => `${n}`;\n");
    const proved = await prove(root, "--changed");
    judged(proved, expecting(all, { fellBackOn: [HELPER] }));
    nothingRunning(root);
  });

  it("a change to revoke.ts proves the 2 journeys that call revoke, whatever the words of the planted comment", async () => {
    const root = seeded();
    append(root, REVOKE_HANDLER, note());
    const proved = await prove(root, "--changed");
    judged(proved, expecting(calling(map, "allowance.revoke"), { judges: ["allowance.revoke"] }));
    nothingRunning(root);
  });

  it("a changed starting world (`funded`) proves the 5 journeys that stand on it, not the ones that stand on `founded` alone", async () => {
    const root = seeded();
    append(root, `${WORLD}/funded.ts`, note());
    const proved = await prove(root, "--changed");
    judged(proved, expecting(standingOn(map, "funded")));
    expect(proved.report?.changed?.rerun).toHaveLength(5);
    nothingRunning(root);
  });

  it("a changed starting world one other is made from (`founded`) proves every journey that stands on it, through `funded` and `invited`: 12", async () => {
    const root = seeded();
    append(root, `${WORLD}/founded.ts`, note());
    const proved = await prove(root, "--changed");
    judged(proved, expecting(standingOn(map, "founded")));
    expect(proved.report?.changed?.rerun).toHaveLength(12);
    nothingRunning(root);
  });

  it("an edit to a helper no handler imports (in the record, so it is a change, not a new file) proves all 15 and names it", async () => {
    const root = seeded();
    append(root, MONEY, note());
    judged(await prove(root, "--changed"), expecting(all, { fellBackOn: [MONEY] }));
    nothingRunning(root);
  });

  it("a deleted helper (in the record) proves all 15 and names it", async () => {
    const root = seeded();
    rmSync(join(root, MONEY));
    judged(await prove(root, "--changed"), expecting(all, { fellBackOn: [MONEY] }));
    nothingRunning(root);
  });

  it("a changed package.json (a file the map cannot place) proves all 15 and names it", async () => {
    const root = seeded();
    append(root, PACKAGE, "\n");
    judged(await prove(root, "--changed"), expecting(all, { fellBackOn: [PACKAGE] }));
    nothingRunning(root);
  });

  it("a change only an eval reads (the log that says why grant refused) reruns the 6 journeys, which pass, and judges grant's evals again: explainability fails and prove exits 1", async () => {
    const root = seeded();
    dropDecidingLog(root);
    const proved = await prove(root, "--changed");
    judged(proved, expecting(calling(map, "allowance.grant"), { passes: false, fails: [], judges: ["allowance.grant"], evalFails: ["allowance.grant explainability ✘"] }));
    nothingRunning(root);
  });

  for (const [file, kind] of [[LOCK, "the lockfile"], [TSCONFIG, "tsconfig.json"], [ENV, "an env file"]] as const) {
    it(`a changed ${kind} (${file}), a file the map cannot place, proves all 15 and names it`, async () => {
      const root = seeded();
      append(root, file, "\n");
      judged(await prove(root, "--changed"), expecting(all, { fellBackOn: [file] }));
      nothingRunning(root);
    });
  }

  it("two changes at once prove the union of what each touches, not the first one's", async () => {
    const root = seeded();
    plantHandler(root);
    plantRead(root);
    plantJourney(root);
    const proved = await prove(root, "--changed");
    judged(proved, expecting([...new Set([...SPEND_JOURNEYS, "read an allowance", "spend twice with one request", "an outsider cannot revoke"])]));
    nothingRunning(root);
  });

  it("a placeable change beside one it cannot place still proves everything, naming the one it cannot place", async () => {
    const root = seeded();
    plantHandler(root);
    append(root, CONFIG, "\n// planted\n");
    const proved = await prove(root, "--changed");
    judged(proved, expecting(all, { fellBackOn: [CONFIG] }));
    nothingRunning(root);
  });

  it("the record moves on: a second --changed straight after a rerun runs none of the 15 and exits 0", async () => {
    const root = seeded();
    plantHandler(root);
    judged(await prove(root, "--changed"), expecting(SPEND_JOURNEYS));
    const again = await prove(root, "--changed");
    judged(again, expecting([]));
    expect(again.report?.changed?.skipped).toHaveLength(15);
    nothingRunning(root);
  });

  it("a change that fails is never recorded as proven: the journeys that failed rerun until they pass, and then nothing reruns", async () => {
    const root = seeded();
    breakSpend(root);
    // `revoke then spend` calls spend but never reaches its handler (the machine refuses first), so the break fails two of the three.
    // A record keyed by hashes may rerun the failing two or all three on the next run: both are right; running none, or others, is not.
    const either = (proved: Proved, passes: boolean) => {
      const ways = [FAILING, SPEND_JOURNEYS].map((ran) => problems(proved, expecting(ran, { passes, fails: FAILING })));
      expect(ways.some((found) => found.length === 0), `${proved.out.slice(-300)}\n${JSON.stringify(ways)}`).toBe(true);
    };
    judged(await prove(root, "--changed"), expecting(SPEND_JOURNEYS, { passes: false, fails: FAILING }));
    either(await prove(root, "--changed"), false);
    writeFileSync(join(root, SPEND), readFileSync(join(acme, SPEND), "utf8"));
    either(await prove(root, "--changed"), true);
    judged(await prove(root, "--changed"), expecting([]));
    nothingRunning(root);
  });
});

describe.concurrent("29 ST1.23, two more false greens Codex found in the build: a mounted dependency, and two journeys of one name", () => {
  // (a) A plugin mounted from node_modules: a file of it that its handlers import, which is not a handler, is a change to something an
  // operation's steps reach. `ortho impact` places it on the mount's operations; `--changed` must place it on the journeys that call them.
  const DEPENDENCY = "node_modules/@fixture/echo/dist/blueprint/choices.js";
  const rowCopies: Array<{ readonly remove: () => void }> = [];
  afterAll(() => { for (const copy of rowCopies.splice(0)) copy.remove(); });
  let echoBase: Copy;
  let echoRecord = "";
  let echoMap: JourneyMap;
  let echoAll: ReadonlyArray<string>;
  const echoProject = () => {
    const copy = project({ kind: "echo" });
    mountEcho(copy.root, { pick: "plain" });
    succeeds(copy.root, "generate");
    return copy;
  };
  const echoSeeded = () => {
    const copy = echoProject();
    rowCopies.push(copy);
    mkdirSync(dirname(join(copy.root, RECORD)), { recursive: true });
    writeFileSync(join(copy.root, RECORD), echoRecord);
    return copy.root;
  };
  const withEcho = (over: Partial<Expected> = {}) => expecting(calling(echoMap, "echo.repeat", "echo.shout"), { all: echoAll, map: echoMap, ...over });

  // (b) Two journey files that declare one name. Prove reports journeys by name, so the check tells them apart by their steps' titles.
  const TWIN = "journeys/outsider-cannot-revoke-twin.ts";
  const SAME = "an outsider cannot revoke";
  const ORIGINAL_STEP = "bob is refused and the handler never runs";
  const TWIN_STEP = "bob is refused, the twin's way";
  let twinBase: ReturnType<typeof copyOf>;
  let twinRecord = "";
  let twinMap: JourneyMap;
  let twinAll: ReadonlyArray<string>;
  const twinProject = () => {
    const copy = copyOf(acme);
    writeFileSync(join(copy.root, TWIN), readFileSync(join(copy.root, JOURNEY), "utf8").replace(ORIGINAL_STEP, TWIN_STEP));
    return copy;
  };
  const twinSeeded = () => {
    const copy = twinProject();
    rowCopies.push(copy);
    mkdirSync(dirname(join(copy.root, RECORD)), { recursive: true });
    writeFileSync(join(copy.root, RECORD), twinRecord);
    return copy.root;
  };
  const withTwin = (step: string) => {
    const once = twinAll.indexOf(SAME);
    return expecting([SAME], { all: twinAll, map: twinMap, skipped: twinAll.filter((_, i) => i !== once), titles: { [SAME]: [step] } });
  };

  setups.push(async () => {
    echoBase = echoProject();
    const echoFull = await prove(echoBase.root);
    expect(echoFull.status, echoFull.out.slice(-600)).toBe(0);
    echoRecord = readFileSync(join(echoBase.root, RECORD), "utf8");
    echoMap = modelOf(echoBase.root);
    echoAll = journeyNames(echoMap);
  });
  setups.push(async () => {
    twinBase = twinProject();
    const twinFull = await prove(twinBase.root);
    expect(twinFull.status, twinFull.out.slice(-600)).toBe(0);
    twinRecord = readFileSync(join(twinBase.root, RECORD), "utf8");
    twinMap = JSON.parse(succeeds(twinBase.root, "model", "--json").stdout) as JourneyMap;
    twinAll = journeyNames(twinMap);
  });
  afterAll(() => { echoBase?.remove(); twinBase?.remove(); });

  it("controls: the plugin's journey is the only one that calls its operations (1 of 16), and an edit to a file of the package is seen by `ortho impact` as stale on that mount's operations", () => {
    expect(echoAll).toHaveLength(16);
    expect(calling(echoMap, "echo.repeat", "echo.shout")).toEqual([echoJourneyTitle]);
    const root = echoSeeded();
    expect(run(root, "impact").out, "before any change").toMatch(/^stale none$/m);
    append(root, DEPENDENCY, note());
    const impact = run(root, "impact");
    expect(impact.status, impact.out).toBe(0);
    expect(impact.out.match(/^stale (.*)$/m)?.[1], "today's impact sees the package's bytes: it is the operations of the mount").toBe("echo.repeat, echo.shout");
  });

  it("controls: two journey files of one name are accepted, the full prove runs both (16 journeys, the name twice), and the judge tells the twin from the original by its steps", () => {
    expect(twinAll).toHaveLength(16);
    expect(twinAll.filter((name) => name === SAME)).toHaveLength(2);
    const right = perfect(withTwin(TWIN_STEP));
    expect(problems(right, withTwin(TWIN_STEP))).toEqual([]);
    expect(problems(right, withTwin(ORIGINAL_STEP)), "the other file's steps").not.toEqual([]);
    expect(problems({ ...right, out: right.out.replace(`journey ${SAME} skipped: nothing it calls changed\n`, "") }, withTwin(TWIN_STEP)), "the other one not named skipped").not.toEqual([]);
    const both = { ...right, report: { ...right.report, journeys: [...right.report.journeys, right.report.journeys[0]!] } };
    expect(problems(both, withTwin(TWIN_STEP)), "both reran").not.toEqual([]);
  });

  it("a change to a file of a mounted plugin that its handlers import proves the 1 journey that calls the plugin's operations and names the other 15 skipped", async () => {
    const root = echoSeeded();
    append(root, DEPENDENCY, note());
    const proved = await prove(root, "--changed");
    judged(proved, withEcho());
    expect(proved.report?.changed?.rerun).toEqual([echoJourneyTitle]);
    nothingRunning(root);
  });

  it("changing only the twin of two journeys of one name reruns that one, and names the original skipped", async () => {
    const root = twinSeeded();
    append(root, TWIN, note());
    judged(await prove(root, "--changed"), withTwin(TWIN_STEP));
    nothingRunning(root);
  });

  it("changing only the original of two journeys of one name reruns that one, and names the twin skipped", async () => {
    const root = twinSeeded();
    append(root, JOURNEY, note());
    judged(await prove(root, "--changed"), withTwin(ORIGINAL_STEP));
    nothingRunning(root);
  });
});

describe.concurrent("29 ST1.23, two more false greens the review found: a generated file, and a handler that imports another's", () => {
  const rowCopies: Array<{ readonly remove: () => void }> = [];
  afterAll(() => { for (const copy of rowCopies.splice(0)) copy.remove(); });

  // (1) generated/ is hashed (header), so a change there cannot be placed: everything, naming the file, and never a green with 0 journeys.
  const GENERATED = "generated/server/main.ts";
  const breakGenerated = (root: string) => append(root, GENERATED, '\nthrow new Error("planted: the generated server no longer starts");\n');

  // (2) health's handler imports a value from grant's, on a project of its own (the other rows' handlers import nothing).
  const IMPORTED = 'export const STATUS = "ok" as const;\n';
  const HEALTH = "src/system/health.ts";
  let importBase: ReturnType<typeof copyOf>;
  let importRecord = "";
  let importMap: JourneyMap;
  const importerProject = () => {
    const copy = copyOf(acme);
    append(copy.root, GRANT, `\n${IMPORTED}`);
    edit(copy.root, HEALTH, (t) => t.replace('import type { Handler }', 'import { STATUS } from "../allowance/grant.ts";\nimport type { Handler }').replace('{ status: "ok" as const }', "{ status: STATUS }"));
    return copy;
  };
  const wantImporter = (over: Partial<Expected> = {}) =>
    expecting([...new Set([...calling(importMap, "allowance.grant"), "health is up"])], { map: importMap, passes: false, fails: ["health is up"], ...over });
  setups.push(async () => {
    importBase = importerProject();
    const full = await prove(importBase.root);
    expect(full.status, full.out.slice(-600)).toBe(0);
    importRecord = readFileSync(join(importBase.root, RECORD), "utf8");
    importMap = modelOf(importBase.root);
  });
  afterAll(() => importBase?.remove());

  it("control: a full prove cannot run the world once a throw is appended to the generated server, and passes before it", async () => {
    const root = seeded(false);
    breakGenerated(root);
    const full = await prove(root);
    expect(full.status, full.out.slice(-300)).not.toBe(0);
    expect(full.report?.passed).not.toBe(true);
    nothingRunning(root);
  });

  it("control: health imports its status from grant.ts and passes; changing the value fails 'health is up' alone, though only grant.ts changed", async () => {
    expect(importMap.journeys).toBeDefined();
    const copy = importerProject();
    rowCopies.push(copy);
    edit(copy.root, GRANT, (t) => t.replace(IMPORTED, 'export const STATUS = "down" as never;\n'));
    const full = await prove(copy.root);
    expect(full.report!.journeys.filter((j) => j.verdict !== "pass").map((j) => j.name)).toEqual(["health is up"]);
    nothingRunning(copy.root);
  });

  it("control: the judge refuses a run that skips the importer", () => {
    const want = wantImporter();
    expect(want.ran).toHaveLength(7);
    expect(problems(perfect(want), want)).toEqual([]);
    expect(problems(perfect(wantImporter({ ran: calling(importMap, "allowance.grant") })), want)).not.toEqual([]);
  });

  it("a change to a generated file (the server's main.ts, which a full prove can no longer run) proves all 15 and names the file; it is never a green with 0 journeys", async () => {
    const root = seeded();
    breakGenerated(root);
    const proved = await prove(root, "--changed");
    expect(proved.out, "it must say it cannot place the generated file and proves everything").toMatch(new RegExp(`^prove --changed: proving all 15 journeys: .*cannot place.*${GENERATED.replace(/[./]/g, "\\$&")}`, "m"));
    expect(proved.out).not.toMatch(/proving 0 of/);
    expect(proved.status, proved.out.slice(-300)).not.toBe(0);
    expect(proved.report?.passed).not.toBe(true);
    nothingRunning(root);
  });

  it("a change to a value one handler exports and another imports (grant.ts, which health.ts imports) reruns the importer's journey, 'health is up', or proves all", async () => {
    const root = (() => {
      const copy = importerProject();
      rowCopies.push(copy);
      mkdirSync(dirname(join(copy.root, RECORD)), { recursive: true });
      writeFileSync(join(copy.root, RECORD), importRecord);
      return copy.root;
    })();
    edit(root, GRANT, (t) => t.replace(IMPORTED, 'export const STATUS = "down" as never;\n'));
    const proved = await prove(root, "--changed");
    const ways = [wantImporter(), expecting(all, { map: importMap, passes: false, fails: ["health is up"], fellBackOn: [GRANT] })].map((want) => problems(proved, want));
    expect(ways.some((found) => found.length === 0), `${proved.out.slice(-300)}\n${JSON.stringify(ways)}`).toBe(true);
    nothingRunning(root);
  });
});
