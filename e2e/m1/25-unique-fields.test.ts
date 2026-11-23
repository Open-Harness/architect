// Check 25 (S-04, G4; rewritten for G5, ST1.13): a thing's rules are their own declarations. `blueprint/things/<thing>/invariants.ts` holds one
// export per rule, `Blueprint.invariant.unique(Thing.fields.x, { while, refuse, description })`, and the RUNTIME refuses: the handler checks
// nothing. A fixture project (`e2e/fixtures/m1/invariants`, overlaid on acme) has a `handle` with two rules, `oneHolderPerName` (while claimed,
// refuses HandleTaken) and `oneNamePerPerson` (refuses HandleAlreadyOwned, with the written description "you already hold a name"), and a
// `profile` with `onePagePerHandle`, which names no refusal. Its handlers make no check: `claim` inserts and moves. Real workerd and a real
// local D1, no Docker, port from the OS. Written by the checks author; a builder never edits this file or that fixture.
//
// What is pinned (G5, `design/decisions/G5-invariants.md`):
//  1. the model: `things.<t>.invariants.<rule>` is { kind: "unique", fields, while, refuse?, description? } and `operations.<op>.invariants` maps each
//     refusal to its rule's full name, for every operation that can break the rule (section 3): `handle.claim` both, `handle.release` none (it
//     only leaves `claimed`), `handle.rename` none (the blind spot: no move, a default step), `profile.make` none (no refusal to attach);
//     an invariant's error leaves `errors` and sits in `refusals`;
//  2. the compiler refuses, naming the file: a field, a state or an error of another thing, a refusal field outside the key, an error owned
//     twice, an error also in a verb's `errors:` (G5's own sentence, naming the verb's file), actors, and a client operation that breaks a rule;
//  3. in a real world: claim, a taken name (HandleTaken), a second name for one person (HandleAlreadyOwned), release then claim, concurrent claims
//     with one winner, each refusal on its span with `refusal.invariant`, a missed breaker dying with the rule's and the operation's names, and a rule
//     with no `refuse` found by `findBy(rule, value)` and dying as a defect when a handler breaks it;
//  4. it falls out: the docs, the MCP tool's description, the scaffold's header and the portal's data say it, in the generated sentence or, for
//     `oneNamePerPerson`, its written description; and the fixture's journey reaches both refusals.
// Package halves (also G5): the compiler's `model/invariants.test.ts`, language-effect's `records/find-by.test.ts` and its siblings, the host's
// `store/unique.test.ts`.
//
// Red today on the missing surface only: `Blueprint.invariant` is not a function, so the fixture compiles nowhere. The controls, true today: the
// fixture without its rules compiles and carries no `invariants`.
import { cpSync, existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, afterEach, describe, expect, it } from "vitest";
import * as W from "./loop-world.ts";
import { copyOf, acme, fixtures, model, repo, run, succeeds, textAt } from "./support.ts";

const copies: Array<ReturnType<typeof copyOf>> = [];
afterEach(() => { for (const copy of copies.splice(0)) copy.remove(); });

/** A project copy for one test, removed after it (`afterEach`). The suite-wide world's copy is made with `shared`: it is the caller's to keep until `afterAll`, after `loop.close()`. */
const project = (edits: Readonly<Record<string, (text: string) => string>> = {}, without: ReadonlyArray<string> = [], shared?: { copy?: ReturnType<typeof copyOf> }) => {
  const copy = copyOf(acme);
  if (shared === undefined) copies.push(copy);
  else shared.copy = copy;
  cpSync(join(fixtures, "invariants"), copy.root, { recursive: true });
  for (const path of without) rmSync(join(copy.root, path), { force: true });
  for (const [path, edit] of Object.entries(edits)) writeFileSync(join(copy.root, path), edit(readFileSync(join(copy.root, path), "utf8")));
  return copy.root;
};
const HANDLE = "blueprint/things/handle";
const PROFILE = "blueprint/things/profile";
const RULES = [`${HANDLE}/invariants.ts`, `${PROFILE}/invariants.ts`];
const append = (text: string) => (before: string) => `${before}\n${text}\n`;

interface Rules { readonly invariants?: Record<string, { readonly kind: string; readonly fields: ReadonlyArray<string>; readonly while?: ReadonlyArray<string>; readonly refuse?: string; readonly description?: string }> }
interface M { readonly things: Record<string, Rules & { readonly errors?: Record<string, unknown> }>; readonly operations: Record<string, { readonly errors: ReadonlyArray<string>; readonly refusals: ReadonlyArray<string>; readonly invariants?: Record<string, string> }>; readonly journeys?: Record<string, { readonly name: string; readonly steps: ReadonlyArray<{ readonly checks?: ReadonlyArray<{ readonly kind: string; readonly error?: string }> }> }> }

describe("25 control: the fixture without its rules", () => {
  it("compiles and generates, and the model has both things and their operations and no rule", { timeout: 300_000 }, () => {
    const root = project({}, RULES);
    const m = model(root) as unknown as M;
    expect(Object.keys(m.things)).toEqual(expect.arrayContaining(["handle", "profile"]));
    expect(Object.keys(m.operations)).toEqual(expect.arrayContaining(["handle.claim", "handle.release", "handle.resolve", "handle.rename", "profile.make", "profile.get"]));
    expect(Object.values(m.things).filter((t) => t.invariants !== undefined && Object.keys(t.invariants).length > 0)).toEqual([]);
  });
});

describe("25 G5: the model carries the rules and which operations can break them", () => {
  it("`things.handle.invariants` and `things.profile.invariants` are the declarations, with the written description", { timeout: 300_000 }, () => {
    const m = model(project()) as unknown as M;
    expect(m.things["handle"]?.invariants).toEqual({
      oneHolderPerName: { kind: "unique", fields: ["name"], while: ["claimed"], refuse: "HandleTaken" },
      oneNamePerPerson: { kind: "unique", fields: ["owner"], while: ["claimed"], refuse: "HandleAlreadyOwned", description: "you already hold a name" },
    });
    expect(m.things["profile"]?.invariants?.["onePagePerHandle"]).toMatchObject({ kind: "unique", fields: ["handle"] });
    expect(m.things["profile"]?.invariants?.["onePagePerHandle"]).not.toHaveProperty("refuse");
  });

  it("`handle.claim` lists both refusals, each mapped to its rule, and neither is in `errors`; release, rename and make attach none", { timeout: 300_000 }, () => {
    const m = model(project()) as unknown as M;
    const claim = m.operations["handle.claim"]!;
    expect(claim.invariants).toEqual({ HandleTaken: "handle.oneHolderPerName", HandleAlreadyOwned: "handle.oneNamePerPerson" });
    expect(claim.errors).toEqual([]);
    expect(claim.refusals).toEqual(expect.arrayContaining(["HandleTaken", "HandleAlreadyOwned"]));
    for (const op of ["handle.release", "handle.rename", "profile.make", "profile.get", "handle.resolve"]) expect(Object.keys(m.operations[op]!.invariants ?? {}), op).toEqual([]);
    expect(m.operations["handle.resolve"]!.errors).toEqual(["HandleNotFound"]);
  });

  it("a rule's refusal reaches the generated refusals table and the SDK's errors like any other", { timeout: 300_000 }, () => {
    const root = project();
    succeeds(root, "generate");
    expect(textAt(root, "generated/api/src/errors.ts")).toMatch(/HandleTaken: \{ code: "HD-\d+", exit: 10/);
    expect(textAt(root, "generated/api/src/handle/claim.ts")).toMatch(/error: \[[^\]]*HandleTaken[^\]]*HandleAlreadyOwned|error: \[[^\]]*HandleAlreadyOwned[^\]]*HandleTaken/);
  });
});

describe("25 G5: the compiler refuses a rule that cannot hold, naming the file", () => {
  const refused = (root: string, ...patterns: ReadonlyArray<RegExp>) => {
    const result = run(root, "model", "--json");
    expect(result.status, result.out).not.toBe(0);
    for (const pattern of patterns) expect(result.out, `the message should match ${pattern}\n${result.out}`).toMatch(pattern);
    expect(result.out).not.toMatch(/is not a function|Cannot read properties|ERR_MODULE_NOT_FOUND|SyntaxError/);
  };
  const file = (path: string) => new RegExp(path.replaceAll(".", "\\.").replaceAll("/", "\\/"));

  it("a field of another thing", { timeout: 120_000 }, () => {
    refused(project({ [`${HANDLE}/invariants.ts`]: append('import { Profile } from "../profile/thing.ts";\nexport const other = Blueprint.invariant.unique(Profile.fields.handle);') }), file(`${HANDLE}/invariants.ts`), /profile/i, /another thing|its own thing|not a field of handle/i);
  });

  it("a state of another thing's machine", { timeout: 120_000 }, () => {
    refused(project({ [`${HANDLE}/invariants.ts`]: append('import { machine as allowance } from "../allowance/machine.ts";\nexport const wrongState = Blueprint.invariant.unique(Handle.fields.name, { while: [allowance.states.active] });') }), file(`${HANDLE}/invariants.ts`), /active/, /state|machine/i);
  });

  it("an error of another thing", { timeout: 120_000 }, () => {
    refused(project({ [`${HANDLE}/invariants.ts`]: append('import { AllowanceExceeded } from "../allowance/errors.ts";\nexport const wrongError = Blueprint.invariant.unique(Handle.fields.name, { refuse: AllowanceExceeded });') }), file(`${HANDLE}/invariants.ts`), /AllowanceExceeded/, /same thing|another thing|handle/i);
  });

  it("a refusal field that is not in the rule's key", { timeout: 120_000 }, () => {
    const root = project({
      [`${HANDLE}/errors.ts`]: append('import { Handle } from "./thing.ts";\nexport class HandleHeld extends Blueprint.error({ owner: Handle.fields.owner }, { exit: 15 }) {}'),
      [`${HANDLE}/invariants.ts`]: append('import { HandleHeld } from "./errors.ts";\nexport const leaky = Blueprint.invariant.unique(Handle.fields.name, { refuse: HandleHeld });'),
    });
    refused(root, file(`${HANDLE}/invariants.ts`), /owner/, /key|field/i);
  });

  it("an error owned by two rules, and one that is also in a verb's `errors:`, naming the rule and the verb's file", { timeout: 120_000 }, () => {
    refused(project({ [`${HANDLE}/invariants.ts`]: append("export const again = Blueprint.invariant.unique(Handle.fields.name, { refuse: HandleTaken });") }), file(`${HANDLE}/invariants.ts`), /HandleTaken/, /oneHolderPerName|more than one|twice|already/i);
    refused(project({ [`${HANDLE}/verbs/claim.ts`]: (t) => `import { HandleTaken } from "../errors.ts";\n${t.replace("move: machine.moves.claim,", "move: machine.moves.claim,\n  errors: [HandleTaken],")}` }),
      /HandleTaken is refused by the runtime for handle\.oneHolderPerName/, /take it out of `errors`/, file(`${HANDLE}/verbs/claim.ts`));
  });

  it("a thing that lives as actors, with the real reason", { timeout: 120_000 }, () => {
    refused(project({ [`${PROFILE}/thing.ts`]: (t) => t.replace('code: "PR",', 'code: "PR",\n  lives: "actor",') }), file(`${PROFILE}/invariants.ts`), /actor/i, /Durable Object|its own instance|no shared index/i);
  });

  it("a client operation that breaks a rule: the device has no store", { timeout: 120_000 }, () => {
    refused(project({ [`${PROFILE}/verbs/make.ts`]: (t) => t.replace("allowed:", 'runs: "client",\n  allowed:') }), /profile\.onePagePerHandle/, /client|device/i);
  });
});

describe("25 G5: a real world refuses, and the handler checks nothing", () => {
  // One world for the describe, opened by the first test that asks and shared after: a failure to open it fails each test with its own name, never a hook.
  let opened: Promise<W.Loop> | undefined;
  const kept: { copy?: ReturnType<typeof copyOf> } = {};
  const world = () => (opened ??= (() => { const root = project({}, [], kept); succeeds(root, "generate"); return W.openLoop(root); })());
  afterAll(async () => { await (await opened?.catch(() => undefined))?.close(); kept.copy?.remove(); });

  /** A call's spans once its named span is there; a call with no trace, or no such span in 30 s, fails this test by name and never waits out the file's timeout. */
  const spansOf = async (r: { trace: string | undefined }, operation: string) => {
    expect(r.trace, "the call has a trace").toBeDefined();
    const loop = await world();
    const read = W.until(() => loop.spans(r.trace!), (spans) => W.named(spans, operation) !== undefined, 20_000);
    const spans = await Promise.race([read, new Promise<never>((_, reject) => { setTimeout(() => reject(new Error(`no ${operation} span for trace ${r.trace} within 30 s`)), 30_000); })]);
    expect(W.named(spans, operation), `a ${operation} span`).toBeDefined();
    return spans;
  };

  const call = async (route: string, body: object) => {
    const loop = await world();
    const response = await fetch(`${loop.url}/${route}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const text = await response.text();
    const json = (() => { try { return JSON.parse(text) as Record<string, unknown>; } catch { return { raw: text }; } })();
    return { status: response.status, body: json, trace: W.tracesOf(loop, `/${route}`).at(-1) };
  };
  const refusal = (r: { status: number; body: Record<string, unknown> }) => (r.status >= 400 && r.status < 500 ? r.body["_tag"] : `status ${r.status}`);

  it("a claim, a taken name, a second name for one person, release then claim", { timeout: 300_000 }, async () => {
    const ada = await call("handle/claim", { name: "ada", owner: "o1" });
    expect(ada.status).toBe(200);
    expect(refusal(await call("handle/claim", { name: "ada", owner: "o2" }))).toBe("HandleTaken");
    expect(refusal(await call("handle/claim", { name: "grace", owner: "o1" }))).toBe("HandleAlreadyOwned");
    expect((await call("handle/release", { handle: String(ada.body["handle"]) })).status).toBe(200);
    expect((await call("handle/claim", { name: "ada", owner: "o2" })).status, "a released name is free").toBe(200);
    expect((await call("handle/claim", { name: "grace", owner: "o1" })).status, "a released holder may claim another name").toBe(200);
  });

  it("each refusal is on its span with the rule that made it, and its code, and commits nothing", { timeout: 300_000 }, async () => {
    await call("handle/claim", { name: "spanned", owner: "s1" });
    const taken = await call("handle/claim", { name: "spanned", owner: "s2" });
    const owned = await call("handle/claim", { name: "spanned2", owner: "s1" });
    for (const [r, tag, rule] of [[taken, "HandleTaken", "handle.oneHolderPerName"], [owned, "HandleAlreadyOwned", "handle.oneNamePerPerson"]] as const) {
      const spans = await spansOf(r, "handle.claim");
      expect(W.named(spans, "handle.claim")?.attrs, tag).toMatchObject({ refusal: tag, "refusal.invariant": rule });
      expect(W.named(spans, "handle.claim")?.attrs["refusal.code"], `${tag}'s code`).toMatch(/^HD-\d+$/);
      expect(W.named(spans, "handle.claim")?.attrs["defect"]).toBeUndefined();
      expect(W.named(spans, "handle.claim.commit"), "a refused call commits nothing").toBeUndefined();
    }
  });

  it("ten concurrent claims of one name: one wins, nine are HandleTaken, none is a defect, and releasing the winner frees the name", { timeout: 300_000 }, async () => {
    const results = await Promise.all(Array.from({ length: 10 }, (_, i) => call("handle/claim", { name: "grace2", owner: `race${i}` })));
    expect(results.filter((r) => r.status === 200)).toHaveLength(1);
    expect(results.filter((r) => refusal(r) === "HandleTaken")).toHaveLength(9);
    const winner = results.find((r) => r.status === 200)!;
    expect((await call("handle/release", { handle: String(winner.body["handle"]) })).status).toBe(200);
    expect((await call("handle/claim", { name: "grace2", owner: "later" })).status).toBe(200);
  });

  it("`findBy(rule, value)` finds the holder inside the rule's scope only", { timeout: 300_000 }, async () => {
    const held = await call("handle/claim", { name: "found", owner: "f1" });
    expect((await call("handle/resolve", { name: "found" })).body["handle"]).toBe(held.body["handle"]);
    await call("handle/release", { handle: String(held.body["handle"]) });
    expect(refusal(await call("handle/resolve", { name: "found" })), "a released handle holds nothing").toBe("HandleNotFound");
  });

  it("a rule the compiler could not see an operation break dies as a defect naming the rule and the operation", { timeout: 300_000 }, async () => {
    await call("handle/claim", { name: "kept", owner: "k1" });
    const other = await call("handle/claim", { name: "moved", owner: "k2" });
    const renamed = await call("handle/rename", { handle: String(other.body["handle"]), name: "kept" });
    expect(renamed.status, "a defect, never an undeclared refusal on the wire").toBeGreaterThanOrEqual(500);
    const spans = await spansOf(renamed, "handle.rename");
    expect(String(W.named(spans, "handle.rename")?.attrs["defect"] ?? "")).toMatch(/handle\.oneHolderPerName/);
    expect(String(W.named(spans, "handle.rename")?.attrs["defect"] ?? "")).toMatch(/handle\.rename/);
  });

  it("a rule with no refusal: `findBy` finds the page, and a handler that breaks the rule dies naming it", { timeout: 300_000 }, async () => {
    const h = await call("handle/claim", { name: "paged", owner: "p1" });
    const handle = String(h.body["handle"]);
    const made = await call("profile/make", { handle });
    expect(made.status).toBe(200);
    expect((await call("profile/get", { handle })).body["profile"]).toBe(made.body["profile"]);
    const again = await call("profile/make", { handle });
    expect(again.status).toBeGreaterThanOrEqual(500);
    const spans = await spansOf(again, "profile.make");
    expect(String(W.named(spans, "profile.make")?.attrs["defect"] ?? "")).toMatch(/profile\.onePagePerHandle/);
  });
});

describe("25 G5: the outputs say the rule, in the generated sentence or its written description", () => {
  it("the docs page, the MCP tool's description and the portal's data carry both rules, each by its sentence", { timeout: 300_000 }, () => {
    const root = project();
    succeeds(root, "generate");
    const docs = textAt(root, "generated/docs/handle/claim.md");
    const mcp = textAt(root, "generated/mcp/src/index.ts");
    const portal = JSON.parse(textAt(root, "generated/portal/blueprint.json")) as { model: M };
    for (const [where, text] of [["the docs", docs], ["the MCP tool", mcp]] as const) {
      expect(text, `${where}: the written description of oneNamePerPerson`).toContain("you already hold a name");
      const generated = text.split("\n").find((l) => /HandleTaken/.test(l) && /claimed/i.test(l) && /name/i.test(l) && /handle/i.test(l));
      expect(generated, `${where}: a sentence from oneHolderPerName that carries the thing, the state and the field`).toBeDefined();
    }
    expect(portal.model.things["handle"]?.invariants?.["oneNamePerPerson"]?.description).toBe("you already hold a name");
    expect(portal.model.operations["handle.claim"]?.invariants).toEqual({ HandleTaken: "handle.oneHolderPerName", HandleAlreadyOwned: "handle.oneNamePerPerson" });
  });

  it("the scaffold's header says the runtime refuses each, by which rule and where; the body has no blank for them", { timeout: 300_000 }, () => {
    const root = project({}, ["src/handle/claim.ts"]);
    succeeds(root, "generate");
    expect(existsSync(join(root, "src/handle/claim.ts")), "generate scaffolds the missing handler").toBe(true);
    const scaffold = textAt(root, "src/handle/claim.ts");
    expect(scaffold).toMatch(/HandleTaken[^\n]*the runtime's[^\n]*handle\.oneHolderPerName[^\n]*blueprint\/things\/handle\/invariants\.ts/);
    expect(scaffold).toMatch(/HandleAlreadyOwned[^\n]*the runtime's[^\n]*you already hold a name[^\n]*handle\.oneNamePerPerson/);
    expect(scaffold, "the blank is gone: nothing says the handler refuses them").not.toMatch(/yours to refuse below/);
    expect(scaffold).not.toMatch(/new HandleTaken|new HandleAlreadyOwned/);
  });

  it("the fixture's journey reaches both refusals", { timeout: 300_000 }, () => {
    const m = model(project()) as unknown as M;
    const journey = Object.values(m.journeys ?? {}).find((j) => j.name === "one name, one person");
    expect(journey, "the journey is in the model").toBeDefined();
    const refused = journey!.steps.flatMap((s) => (s.checks ?? []).filter((c) => c.kind === "refuses").map((c) => c.error));
    expect(refused.sort()).toEqual(["HandleAlreadyOwned", "HandleTaken"]);
  });
});

// ST1.17 (G5 section 2): `ortho add thing` writes `blueprint/things/<thing>/invariants.ts` beside `errors.ts`: an empty file with a one-line
// comment, no rule and no blank. The compiler's layout reader takes the name (ST1.15), so the project compiles with it there.
describe("25 G5: `ortho add thing` writes an empty invariants.ts that compiles and declares no rule", () => {
  it("the file is written, a comment and no rule or blank, and the model builds with it and carries no rule", { timeout: 300_000 }, () => {
    const copy = copyOf(join(repo, "examples/starter"));
    copies.push(copy);
    const { root } = copy;
    const path = "blueprint/things/allowance/invariants.ts";
    const added = succeeds(root, "add", "thing", "allowance");
    expect(added.stdout.trim().split("\n"), "add says it wrote the file").toContain(`wrote ${path}`);
    expect(existsSync(join(root, path)), "the file is where G5 puts it, beside errors.ts").toBe(true);
    const text = textAt(root, path);
    // G5 section 2: one comment line with words in it, then `export {};`, and nothing else: no blank line, no second comment, no rule, no blank.
    expect(text, "exactly one non-empty comment line, then `export {};` (no rule, no blank, no spare lines)").toMatch(/^\/\/ [^\s/][^\n]*\nexport \{\};\n$/);
    expect(run(root, "check").out, "check names the three blanks and does not refuse the file").not.toMatch(/invariants/);

    // The blanks filled as layer1/06 does (acme's allowance declarations and what they need), with the written invariants.ts left as add wrote it.
    for (const file of ["thing", "machine", "roles", "events", "errors"]) cpSync(join(acme, `blueprint/things/allowance/${file}.ts`), join(root, `blueprint/things/allowance/${file}.ts`));
    for (const p of ["blueprint/things/organization", "blueprint/values/money.ts"]) {
      cpSync(join(acme, p), join(root, p), { recursive: true, filter: (from) => !from.split("/").pop()!.startsWith(".") });
    }
    expect(textAt(root, path), "filling the others leaves it alone").toBe(text);
    const m = model(root) as unknown as M;
    expect(Object.keys(m.things), "the thing compiles with the file beside its declarations").toContain("allowance");
    expect(Object.keys(m.things["allowance"]?.invariants ?? {}), "an empty file declares no rule").toEqual([]);
  });
});
