// Check 34 (ST1.19, G5 "What Plugged In needs"): Plugged In declares its rules, and the runtime refuses for them. `design/milestones.md`, ST1.19:
//   "`handle/invariants.ts` with `oneHolderPerName` and `oneNamePerPerson` (with its `description`), and `profile/invariants.ts` with `onePagePerHandle` (no refusal),
//    replacing the three one-line `unique:` entries; `profile.get` finds the page through `findBy(onePagePerHandle, …)`; `HandleTaken` and `HandleAlreadyOwned` leave
//    `claim`'s `errors:` and its handler" and "`ortho prove --root examples/plugged-in` is green and the claim journey still refuses both; `git grep -n "new HandleTaken\|new
//    HandleAlreadyOwned\|unique:" examples/plugged-in` finds nothing".
// Today Plugged In has the one-liners and the handler's own `new HandleTaken`, so every test of the second group fails; the first group are the readers' controls (each plants the wrong
// output the readers must refuse) and pass today. A copy of the example is generated and proved in a temp folder, so nothing here writes to the repository.
// Three more reads follow from the slice and are checked with it: `handle.resolve` and `link.add` read through the rules too (G4's `findBy(Thing, "field", …)` dies the moment
// `unique:` is gone), and the runtime, not the handler, refuses (the refused calls' spans say which rule decided: `refusal.invariant`).
// Written by the checks author; a builder never edits this file (AGENTS.md, "Journeys and checks come first").
import { spawn, spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { FileSource } from "@orthograph/prove";
import { Effect } from "effect";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { freePort } from "./clients.ts";
import * as L from "./loop.ts";
import { REFUSALS, WANTED, claimProblems, code, operationProblems, ownedProblems, readProblems, ruleProblems, type ModelView, type Sources } from "./rules-plugged-in.ts";
import { cli } from "../layer1/support.ts";
import { nothingRunning, repo } from "./support.ts";

const example = join(repo, "examples/plugged-in");
const source = (path: string) => readFileSync(join(example, path), "utf8");
/** Every `.ts` file under `src`, by its path from the project: a handler is anywhere a handler can import from. */
const srcFiles = (root: string): Readonly<Record<string, string>> => Object.fromEntries(readdirSync(join(root, "src"), { recursive: true, encoding: "utf8" }).filter((p) => p.endsWith(".ts")).sort().map((p) => [`src/${p}`, readFileSync(join(root, "src", p), "utf8")]));
const sourcesOf = (files: Readonly<Record<string, string>>): Sources => ({
  "profile.get": files["src/profile/get.ts"] ?? "", "handle.resolve": files["src/handle/resolve.ts"] ?? "", "link.add": files["src/link/add.ts"] ?? "", "handle.claim": files["src/handle/claim.ts"] ?? "",
  others: Object.fromEntries(Object.entries(files).filter(([p]) => !["src/profile/get.ts", "src/handle/resolve.ts", "src/link/add.ts", "src/handle/claim.ts"].includes(p))),
});
/** Every file under `generated/` of a project, by its path from `generated/`; what a tool leaves in a dot-folder (`.wrangler`) is no output. */
const generatedFiles = (root: string): Readonly<Record<string, string>> => Object.fromEntries(readdirSync(join(root, "generated"), { recursive: true, withFileTypes: true }).filter((d) => d.isFile()).map((d) => join(d.parentPath, d.name).slice(join(root, "generated").length + 1)).filter((path) => !/(^|\/)\./.test(path)).sort().map((p) => [p, readFileSync(join(root, "generated", p), "utf8")]));

// ---- controls: the readers, planted ----

const good = (): ModelView => ({
  things: structuredClone(Object.fromEntries(Object.entries(WANTED).map(([t, rules]) => [t, { invariants: rules }]))) as ModelView["things"],
  operations: {
    "handle.claim": { errors: [], refusals: ["HandleTaken", "HandleAlreadyOwned", "NotAllowed"], invariants: { ...REFUSALS } },
    "handle.release": { errors: ["HandleNotClaimed"], refusals: ["HandleNotClaimed", "NotAllowed"] },
    "profile.get": { errors: ["ProfileNotFound"], refusals: ["ProfileNotFound"] },
  },
});
const edit = (change: (m: { things: Record<string, { invariants?: Record<string, Record<string, unknown>> }>; operations: Record<string, Record<string, unknown>> }) => void): ModelView => {
  const m = good() as unknown as Parameters<typeof change>[0];
  change(m);
  return m as unknown as ModelView;
};
const goodSources = (): Sources => ({
  "profile.get": 'import { onePagePerHandle } from "../../blueprint/things/profile/invariants.ts";\nimport { oneHolderPerName } from "../../blueprint/things/handle/invariants.ts";\nconst page = records.findBy(onePagePerHandle, id);',
  "handle.resolve": 'import { oneHolderPerName } from "../../blueprint/things/handle/invariants.ts";\nconst held = records.findBy(oneHolderPerName, name);',
  "link.add": 'import { oneNamePerPerson } from "../../blueprint/things/handle/invariants.ts";\nimport { onePagePerHandle } from "../../blueprint/things/profile/invariants.ts";\nrecords.findBy(oneNamePerPerson, p); records.findBy(onePagePerHandle, h);',
  "handle.claim": "// HandleTaken is the runtime's\nconst claim = steps.record(records.insert(Handle, { id, name, owner }));",
  others: { "handle.release": "records.update(Handle, id, {})" },
});

describe("34 controls: the readers pass what is right and refuse each thing planted", () => {
  it("pass the three rules as wanted, the operations as wanted, the reads through the rules and a claim that refuses nothing", () => {
    expect(ruleProblems(good())).toEqual([]);
    expect(operationProblems(good())).toEqual([]);
    expect(readProblems(goodSources())).toEqual([]);
    expect(claimProblems(goodSources()["handle.claim"])).toEqual([]);
  });
  it("rules: one missing, one added, one thing's rules on another, a different field, scope, refusal, description, kind; a description added or dropped", () => {
    expect(ruleProblems(edit((m) => { delete m.things["handle"]!.invariants!["oneNamePerPerson"]; }))).toEqual(["handle.oneNamePerPerson is not declared"]);
    expect(ruleProblems(edit((m) => { delete m.things["profile"]!.invariants; }))).toEqual(["profile.onePagePerHandle is not declared"]);
    expect(ruleProblems(edit((m) => { m.things["profile"]!.invariants!["extra"] = { kind: "unique", fields: ["id"] }; }))).toEqual(["profile.extra is declared, and is not one of the three rules"]);
    expect(ruleProblems(edit((m) => { m.things["link"] = { invariants: { oops: { kind: "unique", fields: ["id"] } } }; }))).toEqual(["link.oops is declared, and is not one of the three rules"]);
    expect(ruleProblems(edit((m) => { m.things["handle"]!.invariants!["oneHolderPerName"]!["fields"] = ["owner"]; }))[0]).toContain('fields is ["owner"]');
    expect(ruleProblems(edit((m) => { m.things["handle"]!.invariants!["oneHolderPerName"]!["while"] = ["claimed", "released"]; }))[0]).toContain("while is");
    expect(ruleProblems(edit((m) => { delete m.things["handle"]!.invariants!["oneHolderPerName"]!["while"]; }))[0]).toContain("while is undefined");
    expect(ruleProblems(edit((m) => { m.things["profile"]!.invariants!["onePagePerHandle"]!["while"] = []; }))[0]).toContain("while is []");
    expect(ruleProblems(edit((m) => { m.things["handle"]!.invariants!["oneHolderPerName"]!["refuse"] = "HandleAlreadyOwned"; }))[0]).toContain("refuse is");
    expect(ruleProblems(edit((m) => { m.things["profile"]!.invariants!["onePagePerHandle"]!["refuse"] = "ProfileNotFound"; }))[0]).toContain("refuse is");
    expect(ruleProblems(edit((m) => { delete m.things["handle"]!.invariants!["oneNamePerPerson"]!["description"]; }))[0]).toContain("description is undefined");
    expect(ruleProblems(edit((m) => { m.things["handle"]!.invariants!["oneNamePerPerson"]!["description"] = "you hold one"; }))[0]).toContain("description is");
    expect(ruleProblems(edit((m) => { m.things["handle"]!.invariants!["oneHolderPerName"]!["description"] = "taken"; }))[0]).toContain("description is");
    expect(ruleProblems(edit((m) => { m.things["handle"]!.invariants!["oneHolderPerName"]!["kind"] = "bound"; }))[0]).toContain("kind is");
    expect(ruleProblems({ things: {}, operations: {} })).toHaveLength(2);
  });
  it("operations: errors left on claim, a rule's refusal mapped wrong or not at all, a refusal lost, another operation mapping one or listing one", () => {
    expect(operationProblems(edit((m) => { m.operations["handle.claim"]!["errors"] = ["HandleTaken"]; }))[0]).toContain("errors are");
    expect(operationProblems(edit((m) => { m.operations["handle.claim"]!["errors"] = ["HandleAlreadyOwned"]; }))[0]).toContain("errors are");
    expect(operationProblems(edit((m) => { delete m.operations["handle.claim"]!["invariants"]; }))[0]).toContain("handle.claim maps undefined");
    expect(operationProblems(edit((m) => { m.operations["handle.claim"]!["invariants"] = { HandleTaken: "handle.oneHolderPerName" }; }))[0]).toContain("handle.claim maps");
    expect(operationProblems(edit((m) => { m.operations["handle.claim"]!["invariants"] = { HandleTaken: "handle.oneNamePerPerson", HandleAlreadyOwned: "handle.oneHolderPerName" }; }))[0]).toContain("handle.claim maps");
    expect(operationProblems(edit((m) => { m.operations["handle.claim"]!["refusals"] = ["HandleTaken", "NotAllowed"]; }))).toEqual(["handle.claim no longer refuses HandleAlreadyOwned"]);
    expect(operationProblems(edit((m) => { m.operations["handle.release"]!["invariants"] = { HandleTaken: "handle.oneHolderPerName" }; }))[0]).toContain("handle.release maps refusals to rules");
    expect(operationProblems(edit((m) => { m.operations["profile.get"]!["errors"] = ["ProfileNotFound", "HandleTaken"]; }))).toEqual(["profile.get lists HandleTaken among its errors, which a rule owns"]);
    expect(operationProblems({ things: {}, operations: {} })).toEqual(["the model has no operation handle.claim"]);
  });
  it("reads: one still on G4's spelling, one on the wrong rule, one not imported from the rule, one found only in a comment, one left in another file", () => {
    const planted = (key: keyof Omit<Sources, "others">, change: (s: string) => string): Sources => ({ ...goodSources(), [key]: change(goodSources()[key]) });
    expect(readProblems(planted("profile.get", (s) => s.replace("findBy(onePagePerHandle, id)", 'findBy(Profile, "handle", id)')))).toEqual(expect.arrayContaining(["profile.get does not find through findBy(onePagePerHandle, …)", `profile.get still finds by G4's findBy(Thing, "field", …)`]));
    expect(readProblems(planted("handle.resolve", (s) => s.replace("findBy(oneHolderPerName", "findBy(oneNamePerPerson")))).toContain("handle.resolve does not find through findBy(oneHolderPerName, …)");
    expect(readProblems(planted("link.add", (s) => s.replace("findBy(oneNamePerPerson, p)", "findBy(oneHolderPerName, p)")))).toContain("link.add does not find through findBy(oneNamePerPerson, …)");
    expect(readProblems(planted("link.add", (s) => s.replace("records.findBy(onePagePerHandle, h)", "")))).toContain("link.add does not find through findBy(onePagePerHandle, …)");
    expect(readProblems(planted("profile.get", (s) => s.replace('import { onePagePerHandle } from "../../blueprint/things/profile/invariants.ts";\n', "")))).toContain("profile.get does not import onePagePerHandle from blueprint/things/profile/invariants.ts");
    expect(readProblems(planted("profile.get", (s) => s.replace('invariants.ts"', 'other.ts"')))).toContain("profile.get does not import onePagePerHandle from blueprint/things/profile/invariants.ts");
    expect(readProblems(planted("handle.resolve", (s) => s.replace("const held = records.findBy(oneHolderPerName, name);", "// records.findBy(oneHolderPerName, name)")))).toContain("handle.resolve does not find through findBy(oneHolderPerName, …)");
    expect(readProblems({ ...goodSources(), others: { "link.order": 'records.findBy(Handle, "owner", p)' } })).toEqual([`link.order still finds by G4's findBy(Thing, "field", …)`]);
  });
  it("src: either refusal named in any file, or the runtime's span attributes written by a handler; not in a comment", () => {
    expect(ownedProblems({ "src/handle/guard.ts": "return yield* new (Errors.declared as any)(\"x\"); // HandleTaken" })).toEqual([]);
    expect(ownedProblems({ "src/handle/guard.ts": "const e = new HandleTaken({});" })).toEqual(["src/handle/guard.ts names HandleTaken: the runtime refuses it, for the rules"]);
    expect(ownedProblems({ "src/x.ts": "import { HandleAlreadyOwned } from '../blueprint/things/handle/errors.ts';" })).toHaveLength(1);
    expect(ownedProblems({ "src/x.ts": 'Effect.annotateCurrentSpan({ "refusal.invariant": "handle.oneHolderPerName", "refusal.log": "x" })' })).toHaveLength(2);
    expect(ownedProblems({ "src/handle/guard.ts": 'return yield* new (Errors.declared as any)["Handle" + "Taken"]({});' })).toEqual(["src/handle/guard.ts picks a declared error by a computed name, which no name search can read"]);
    expect(ownedProblems({ "src/handle/claim.ts": "const claim = records.insert(Handle, { id, name, owner });" })).toEqual([]);
  });
  it("claim: a lookup left in it, either refusal named in code, even in the destructuring that fetches the errors; not a comment", () => {
    expect(claimProblems("const holder = yield* steps.load(records.findBy(Handle, 'name', name));")[0]).toContain("still looks a holder up");
    expect(claimProblems("return yield* new HandleTaken({});")).toEqual(["handle.claim's handler still names HandleTaken"]);
    expect(claimProblems("const { HandleTaken, HandleAlreadyOwned } = Errors.declared;")).toHaveLength(2);
    expect(claimProblems("/** Refusals: HandleTaken (the runtime's) */\n// HandleAlreadyOwned too\nreturn { handle: id };")).toEqual([]);
    expect(code("const a = 1; // new HandleTaken")).not.toContain("HandleTaken");
  });
});

// ---- the slice ----

/**
 * `ortho prove` on a copy, with its whole process group stopped when it has not finished in `ms`. A build whose handler imports a rule it no longer declares never gets its world up, and
 * prove then waits for ever (seen on a stand-in with a rule missing): that is this check's failure, said as a status of null and a line, not a run that holds the machine and the CI job.
 */
const proveWithin = (root: string, args: ReadonlyArray<string>, ms: number) => new Promise<{ readonly status: number | null; readonly out: string }>((done) => {
  const child = spawn(process.execPath, [cli, "prove", ...args, "--root", root], { cwd: root, detached: true, stdio: ["ignore", "pipe", "pipe"] });
  let out = "";
  let stopped = false;
  child.stdout.on("data", (d: Buffer) => { out += d.toString(); });
  child.stderr.on("data", (d: Buffer) => { out += d.toString(); });
  const stop = () => { try { process.kill(-child.pid!, "SIGKILL"); } catch { /* none left */ } };
  const timer = setTimeout(() => { stopped = true; stop(); }, ms);
  child.on("close", (status) => {
    clearTimeout(timer);
    stop(); // the world's own processes are in the group: none is left running
    done({ status: stopped ? null : status, out: stopped ? `prove did not finish in ${ms / 1000} s and was stopped; what it printed:\n${out}` : out });
  });
});

const proved = { journeys: {} as Record<string, { name: string; steps: ReadonlyArray<{ checks?: ReadonlyArray<{ kind: string; error?: string }> }> }>, copy: undefined as undefined | ReturnType<typeof L.freshProject>, model: undefined as undefined | ModelView, run: undefined as undefined | { readonly status: number | null; readonly out: string }, report: undefined as undefined | { journeys: ReadonlyArray<{ name: string; verdict: string }> }, spans: [] as ReadonlyArray<{ name: string; attrs: Readonly<Record<string, unknown>> }> };
beforeAll(async () => {
  const copy = L.freshProject(example);
  proved.copy = copy;
  proved.model = L.modelOf(copy.root) as unknown as ModelView;
  proved.journeys = (L.modelOf(copy.root) as unknown as { journeys: typeof proved.journeys }).journeys;
  const reportFile = join(copy.root, ".ortho/report.json");
  proved.run = await proveWithin(copy.root, ["--env", "local", "--port", String(await freePort()), "--report", reportFile], 240_000);
  proved.report = existsSync(reportFile) ? JSON.parse(readFileSync(reportFile, "utf8")) as typeof proved.report : undefined;
  proved.spans = await Effect.runPromise(FileSource.open(join(copy.root, ".ortho/prove-telemetry")).window(30 * 24 * 3_600_000).pipe(
    Effect.map((traces) => [...traces.values()].flatMap((trace) => trace.spans.map((span) => ({ name: span.name, attrs: span.attrs })))),
    Effect.orElseSucceed(() => []),
  ));
}, 600_000);
afterAll(() => { const root = proved.copy?.root; proved.copy?.remove(); if (root !== undefined) nothingRunning(root); });

describe("34 ST1.19: Plugged In declares its rules", () => {
  it("declares exactly handle.oneHolderPerName, handle.oneNamePerPerson (with its description) and profile.onePagePerHandle (no refusal), as the compiled model carries them", () => {
    expect(ruleProblems(proved.model!)).toEqual([]);
  });

  it("hands both refusals to the rules: they leave handle.claim's errors, stay among its refusals, and map to their rules; no other operation maps one", () => {
    expect(operationProblems(proved.model!)).toEqual([]);
  });

  it("keeps the committed generated/ as `ortho generate` writes it, file for file, so the grid, the docs and the portal read this commit's rules", () => {
    const committed = generatedFiles(example);
    const fresh = generatedFiles(proved.copy!.root);
    expect({ files: Object.keys(committed), differing: Object.keys(committed).filter((p) => committed[p] !== fresh[p]) }).toEqual({ files: Object.keys(fresh), differing: [] });
  });

  it("leaves no one-line `unique:` entry, `new HandleTaken` or `new HandleAlreadyOwned` anywhere in examples/plugged-in (`git grep -n`, as the slice words it)", () => {
    const found = spawnSync("git", ["grep", "-n", "new HandleTaken\\|new HandleAlreadyOwned\\|unique:", "--", "examples/plugged-in"], { cwd: repo, encoding: "utf8" });
    expect({ status: found.status, matches: found.stdout.trim() }).toEqual({ status: 1, matches: "" });
  });

  it("finds the page through findBy(onePagePerHandle, …) in profile.get, and every other read (handle.resolve, link.add) through its rule too, none on G4's spelling", () => {
    expect(readProblems(sourcesOf(srcFiles(example)))).toEqual([]);
  });

  it("leaves the refusals to the runtime: handle.claim's handler looks nothing up and names neither HandleTaken nor HandleAlreadyOwned", () => {
    expect(claimProblems(source("src/handle/claim.ts"))).toEqual([]);
    expect(ownedProblems(srcFiles(example)), "no file of `src` refuses for the rules or writes the runtime's span attributes").toEqual([]);
  });

  it("is proved green by `ortho prove`, with the claim journeys that refuse both rules still passing", () => {
    expect(proved.run!.status, proved.run!.out).toBe(0);
    const verdicts = Object.fromEntries((proved.report?.journeys ?? []).map((j) => [j.name, j.verdict]));
    expect(verdicts["claim a handle"], proved.run!.out).toBe("pass");
    expect(verdicts["a name is claimed once"], proved.run!.out).toBe("pass");
    expect(Object.values(verdicts).every((v) => v === "pass"), JSON.stringify(verdicts)).toBe(true);
    const journeys = Object.values(proved.journeys);
    const refusing = (name: string, error: string) => journeys.find((j) => j.name === name)?.steps.some((s) => (s.checks ?? []).some((c) => c.kind === "refuses" && c.error === error));
    expect(refusing("a name is claimed once", "HandleTaken"), "a journey step still expects HandleTaken").toBe(true);
    expect(refusing("claim a handle", "HandleAlreadyOwned"), "a journey step still expects HandleAlreadyOwned").toBe(true);
  });

  it("makes the runtime refuse: each refused claim's span names the rule that decided (`refusal.invariant`), and the deciding line names it too", () => {
    for (const [refusal, rule] of Object.entries(REFUSALS)) {
      const spans = proved.spans.filter((s) => s.attrs["refusal"] === refusal);
      expect(spans.length, `no span of a call refused with ${refusal}`).toBeGreaterThan(0);
      for (const s of spans) {
        expect({ refusal, invariant: s.attrs["refusal.invariant"] }, `${s.name}'s refusal is the handler's: no rule named`).toEqual({ refusal, invariant: rule });
        expect(String(s.attrs["refusal.log"] ?? ""), "the deciding line names the rule").toContain(rule);
      }
    }
  });
});
