// S-31 (design/goals/03-snags.md, design/decisions/S31-breaks.md): the compiled model carries, on each operation, every rule it can break, whether
// or not the rule owns a refusal. `operations.<op>.breaks` is a list of full rule names ("<thing>.<rule>"), each once; `operations.<op>.invariants`
// stays what it is (refusal to rule, only for rules that refuse). The compiler already computes the set (`breakersOf`, internal/invariants.ts:102, as
// `breaks`) and `describe.ts:170` drops it; these checks pin what the model keeps.
// The amendment of 21 November 2026 (S31-breaks.md, point 4): a database step that leaves `writes` unset is "unknown", and G5 section 3's rule 3 (a thing with no
// machine, an operation on it with a database step) still catches it, so a missed write stays loud; `writes: []` is "reads only" and breaks nothing. So `profile.get`
// declares `writes: []`, and breaks no rule. Rule 3 has its own synthetic cases below (a machine-less thing, one verb each way): Plugged In alone cannot hold it.
// Written by the checks author; the builder never edits this file. Every case but the controls fails today: `breaks` is not in the model.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { Effect, Exit } from "effect";
import { afterAll, describe, expect, it } from "vitest";
import { nodeSource } from "#modules/source/service.js";
import { Compiler } from "./service.ts";

const scratch = resolve(import.meta.dirname, "../../../.ortho/breaks");
const pluggedIn = resolve(import.meta.dirname, "../../../../../examples/plugged-in");
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

interface Model { operations: Record<string, { invariants?: Record<string, string>; breaks?: ReadonlyArray<string> }> }
const modelOf = async (root: string): Promise<Model> => {
  const exit = await Effect.runPromiseExit(Effect.provide(Compiler.model, nodeSource(root)));
  if (!Exit.isSuccess(exit)) throw new Error(`the model should compile: ${String(exit.cause)}`);
  return exit.value as unknown as Model;
};
const breaksOf = (m: Model, op: string): ReadonlyArray<string> => [...(m.operations[op]?.breaks ?? [])].sort();

const HANDLE = `import { Blueprint } from "orthograph";
export const Handle = Blueprint.thing({ description: "A name someone holds.", code: "HD", fields: { id: Blueprint.id("hdl"), name: Blueprint.text({ max: 40 }) } });\n`;
const MACHINE = `import { Blueprint } from "orthograph";
import { Handle } from "./thing.ts";
import * as Events from "./events.ts";
export const machine = Blueprint.machine(Handle, {
  states: ["claimed", "released"],
  moves: { claim: { from: [], to: "claimed", emits: Events.HandleClaimed }, release: { from: ["claimed"], to: "released", emits: Events.HandleReleased } },
  notFrom: { exit: 60 },
});\n`;
const EVENTS = `import { Blueprint } from "orthograph";
export const HandleClaimed = Blueprint.event({});
export const HandleReleased = Blueprint.event({});\n`;
const ERRORS = `import { Blueprint } from "orthograph";\nexport class HandleTaken extends Blueprint.error({}, { exit: 10 }) {}\n`;
const PAGE = `import { Blueprint } from "orthograph";\nexport const Page = Blueprint.thing({ description: "A page.", code: "PG", fields: { id: Blueprint.id("pag"), handle: Blueprint.text({ max: 40 }) } });\n`;
const RULES = `import { Blueprint } from "orthograph";
import { Handle } from "./thing.ts";
import { machine } from "./machine.ts";
import { HandleTaken } from "./errors.ts";
export const oneHolder = Blueprint.invariant.unique(Handle.fields.name, { while: [machine.states.claimed], refuse: HandleTaken });
export const plain = Blueprint.invariant.unique(Handle.fields.name, { while: [machine.states.claimed] });\n`;
const PAGE_RULES = `import { Blueprint } from "orthograph";\nimport { Page } from "./thing.ts";\nexport const onePerHandle = Blueprint.invariant.unique(Page.fields.handle);\n`;
const VERB = (name: string, move: string | null, steps: string, imports = "") => `import { Blueprint } from "orthograph";
import { Handle } from "../thing.ts";
import { machine } from "../machine.ts";
${imports}void machine;
export default Blueprint.operation(Handle, {
  description: "${name}",
  payload: { name: Handle.fields.name },
  answer: {},
  ${move === null ? "" : `move: machine.moves.${move},\n  `}allowed: [Blueprint.anyone],
  steps: { s: ${steps} },
});\n`;

let n = 0;
const project = (files: Readonly<Record<string, string>>): string => {
  mkdirSync(scratch, { recursive: true });
  const root = mkdtempSync(join(scratch, `p${n++}-`));
  const all = { "things/handle/thing.ts": HANDLE, "things/handle/machine.ts": MACHINE, "things/handle/events.ts": EVENTS, "things/handle/errors.ts": ERRORS, ...files };
  for (const [path, text] of Object.entries(all)) {
    mkdirSync(dirname(join(root, "blueprint", path)), { recursive: true });
    writeFileSync(join(root, "blueprint", path), text);
  }
  return root;
};
const DB = "Blueprint.step.database()";
const VERBS = {
  "things/handle/verbs/claim.ts": VERB("claim", "claim", DB),
  "things/handle/verbs/release.ts": VERB("release", "release", DB),
  "things/handle/verbs/look.ts": VERB("look", null, DB),
};

describe("S-31 control: what the model keeps today stays", () => {
  it("a blueprint with no rules carries no `breaks` on any operation, and `invariants` maps a refusal to its rule as before", async () => {
    const none = await modelOf(project(VERBS));
    for (const op of Object.keys(none.operations)) expect(none.operations[op]?.breaks ?? [], op).toEqual([]);
    const ruled = await modelOf(project({ "things/handle/invariants.ts": RULES, ...VERBS }));
    expect(ruled.operations["handle.claim"]?.invariants).toEqual({ HandleTaken: "handle.oneHolder" });
  });
});

describe("S-31: the model carries every rule an operation can break, with or without a refusal", () => {
  it("a rule with no refusal is in the breaking operation's `breaks` and in no `invariants`; a rule with one is in both", async () => {
    const m = await modelOf(project({ "things/handle/invariants.ts": RULES, ...VERBS }));
    expect(breaksOf(m, "handle.claim"), "claim ends in `claimed`").toEqual(["handle.oneHolder", "handle.plain"]);
    expect(m.operations["handle.claim"]?.invariants, "only the rule that refuses attaches a refusal").toEqual({ HandleTaken: "handle.oneHolder" });
  });

  it("an operation that only leaves the rule's state, and one with no move and a default step, break nothing", async () => {
    const m = await modelOf(project({ "things/handle/invariants.ts": RULES, ...VERBS }));
    for (const quiet of ["handle.release", "handle.look"]) {
      expect(m.operations[quiet]?.breaks, `${quiet} carries an empty list, not an absent one`).toEqual([]);
    }
  });

  it("an operation that can break only a rule with no refusal still carries it (the snag: its spine had no rules stop)", async () => {
    const m = await modelOf(project({
      "things/handle/invariants.ts": RULES.replace(/export const oneHolder[^\n]*\n/, "").replace(/import \{ HandleTaken \}[^\n]*\n/, ""),
      ...VERBS,
    }));
    expect(m.operations["handle.claim"]?.invariants ?? {}, "no refusal to attach").toEqual({});
    expect(breaksOf(m, "handle.claim")).toEqual(["handle.plain"]);
    expect(breaksOf(m, "handle.release")).toEqual([]);
  });

  it("a rule of another thing, broken by a database step that names that thing in `writes`, is carried under its own thing's name", async () => {
    const m = await modelOf(project({
      "things/page/thing.ts": PAGE,
      "things/page/invariants.ts": PAGE_RULES,
      "things/handle/invariants.ts": RULES,
      ...VERBS,
      "things/handle/verbs/claim.ts": VERB("claim", "claim", "Blueprint.step.database({ writes: [Page] })", 'import { Page } from "../../page/thing.ts";\nvoid Page;\n'),
      "things/handle/verbs/look.ts": VERB("look", null, "Blueprint.step.database({ writes: [Page] })", 'import { Page } from "../../page/thing.ts";\nvoid Page;\n'),
    }));
    expect(breaksOf(m, "handle.look"), "no move, and it writes only a page: the page's rule and none of handle's").toEqual(["page.onePerHandle"]);
    expect(breaksOf(m, "handle.claim")).toEqual(["handle.oneHolder", "handle.plain", "page.onePerHandle"]);
    expect(m.operations["handle.claim"]?.invariants, "the page rule refuses nothing").toEqual({ HandleTaken: "handle.oneHolder" });
    expect(breaksOf(m, "handle.release"), "release writes only its own record").toEqual([]);
  });

  it("a rule with no `while` is broken by any move (claim and release), and not by an operation with no move and a default step", async () => {
    const m = await modelOf(project({
      "things/handle/invariants.ts": `${RULES}export const anyMove = Blueprint.invariant.unique(Handle.fields.name);\n`,
      ...VERBS,
    }));
    expect(breaksOf(m, "handle.claim")).toEqual(["handle.anyMove", "handle.oneHolder", "handle.plain"]);
    expect(breaksOf(m, "handle.release"), "release leaves `claimed`, which clears the scoped rules, but a rule with no scope is in force in every state").toEqual(["handle.anyMove"]);
    expect(m.operations["handle.look"]?.breaks).toEqual([]);
  });

  it("each rule is named once, as `<thing>.<rule>`, and every rule with a refusal on an operation is among its `breaks`", async () => {
    const m = await modelOf(project({ "things/handle/invariants.ts": RULES, ...VERBS }));
    for (const [op, entry] of Object.entries(m.operations)) {
      const breaks = entry.breaks ?? [];
      expect(new Set(breaks).size, `${op} names a rule twice`).toBe(breaks.length);
      for (const owner of Object.values(entry.invariants ?? {})) expect(breaks, `${op} refuses for ${owner} without breaking it`).toContain(owner);
    }
    expect(m.operations["handle.claim"]?.breaks, "claim's list is there to be read").toBeDefined();
  });
});

const PAGE_VERB = (name: string, steps: string) => `import { Blueprint } from "orthograph";
import { Page } from "../thing.ts";
export default Blueprint.operation(Page, {
  description: "${name}",
  payload: { handle: Page.fields.handle },
  answer: {},
  allowed: [Blueprint.anyone],
  steps: { ${steps} },
});\n`;
const PAGE_FILES = {
  "things/page/thing.ts": PAGE,
  "things/page/invariants.ts": PAGE_RULES,
  // `Page` has no machine, so section 3's rule 3 is all there is to go on: a database step that says nothing about `writes` is unknown, so it may break the rule; `writes: []` says "reads only".
  "things/page/verbs/unset.ts": PAGE_VERB("unset", "s: Blueprint.step.database()"),
  "things/page/verbs/reads.ts": PAGE_VERB("reads", "s: Blueprint.step.database({ writes: [] })"),
  "things/page/verbs/mixed.ts": PAGE_VERB("mixed", "a: Blueprint.step.database({ writes: [] }), b: Blueprint.step.database()"),
  "things/page/verbs/mixedfirst.ts": PAGE_VERB("mixedfirst", "a: Blueprint.step.database(), b: Blueprint.step.database({ writes: [] })"),
  "things/page/verbs/named.ts": PAGE_VERB("named", "s: Blueprint.step.database({ writes: [Page] })"),
};

describe("S-31 amendment: a database step with `writes` unset is unknown, `writes: []` is reads only (G5 section 3, rule 3)", () => {
  it("a database step with `writes: []` compiles, and the model keeps the empty list (not an absent one), so unset and none stay apart", async () => {
    const m = await modelOf(project(PAGE_FILES));
    const steps = (op: string) => (m as unknown as { operations: Record<string, { steps: Record<string, { writes?: ReadonlyArray<string> }> }> }).operations[op]?.steps ?? {};
    expect(steps("page.reads")["s"]?.writes, "writes: [] is kept as []").toEqual([]);
    expect(steps("page.unset")["s"] !== undefined && "writes" in steps("page.unset")["s"]!, "an unset `writes` stays absent").toBe(false);
    expect(steps("page.named")["s"]?.writes).toEqual(["page"]);
  });

  it("on a thing with no machine, an operation whose database step leaves `writes` unset breaks the rule; one with `writes: []` breaks nothing", async () => {
    const m = await modelOf(project(PAGE_FILES));
    expect(breaksOf(m, "page.unset"), "unknown: rule 3's coarse catch still applies").toEqual(["page.onePerHandle"]);
    expect(m.operations["page.reads"]?.breaks, "reads only: nothing to break, and an empty list, not an absent one").toEqual([]);
  });

  it("an operation with one step that reads and one that is unknown breaks the rule, and one that names the thing in `writes` breaks it too", async () => {
    const m = await modelOf(project(PAGE_FILES));
    expect(breaksOf(m, "page.mixed"), "one unknown step is enough").toEqual(["page.onePerHandle"]);
    expect(breaksOf(m, "page.mixedfirst"), "whichever step it is: the first as well as the last").toEqual(["page.onePerHandle"]);
    expect(breaksOf(m, "page.named"), "named in writes: section 3's rule 2, whatever rule 3 says").toEqual(["page.onePerHandle"]);
  });
});

describe("S-31: Plugged In", () => {
  // `profile.onePagePerHandle` refuses nothing. `handle.claim` makes a profile, so it breaks it (the runtime checks the rule before the commit), but
  // today its step names no `writes: [Profile]`, so `breakersOf` finds only handle's two rules for it (G5 section 3, "misses handle.claim"). The builder
  // names the write in blueprint/things/handle/verbs/claim.ts. `profile.get` is a read: the builder declares `Blueprint.step.database({ writes: [] })` on its
  // step, and it breaks nothing (the runtime's `unit.check` looks only at rows the call writes), so the portal shows it no rules stop. Pinned here, so the
  // portal's fixture (e2e/m1/rules-fixture.ts) tells the truth about it.
  it("handle.claim breaks all three rules, and handle.release breaks none", async () => {
    const m = await modelOf(pluggedIn);
    expect(breaksOf(m, "handle.claim")).toEqual(["handle.oneHolderPerName", "handle.oneNamePerPerson", "profile.onePagePerHandle"]);
    expect(m.operations["handle.release"]?.breaks).toEqual([]);
  });

  it("claim's refusals still map to handle's two rules only, and no other operation breaks a rule: profile.get is a read and declares `writes: []`", async () => {
    const m = await modelOf(pluggedIn);
    expect(m.operations["handle.claim"]?.invariants).toEqual({ HandleTaken: "handle.oneHolderPerName", HandleAlreadyOwned: "handle.oneNamePerPerson" });
    expect(m.operations["profile.get"]?.breaks, "a read writes nothing: no rule to break, and no rules stop").toEqual([]);
    expect(m.operations["profile.get"]?.invariants ?? {}).toEqual({});
    for (const quiet of ["handle.resolve", "link.add", "link.order", "link.remove"]) expect(m.operations[quiet]?.breaks, quiet).toEqual([]);
    for (const [op, entry] of Object.entries(m.operations)) if (op !== "handle.claim") expect(entry.breaks, `${op}: only claim writes a rule's records`).toEqual([]);
  });
});
