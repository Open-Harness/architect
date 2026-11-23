// G5 (ST1.13), the compiler's half: a thing's rules (`blueprint/things/<thing>/invariants.ts`, `Blueprint.invariant.unique`) are in the model,
// with the operations that can break each, and `ortho model` refuses a rule that cannot hold, naming the file. It replaces G4's `unique.test.ts`.
// The end-to-end half, through the real CLI and a real world, is `e2e/m1/25-unique-fields.test.ts`; this file pins what a unit can judge on its own:
// a composite key, a rule with no `while`, the breakers of section 3 rule by rule (a move into the scope, an explicit `writes`, a thing with no
// machine), the exit clash, and the hash. Written by the checks author; the builder never edits this file.
// Today every case but the control fails: `Blueprint.invariant` is not a function.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { Effect, Exit } from "effect";
import { afterAll, describe, expect, it } from "vitest";
import { nodeSource } from "#modules/source/service.js";
import { BlueprintInvalid } from "./types.ts";
import { Compiler } from "./service.ts";

const scratch = resolve(import.meta.dirname, "../../../.ortho/invariants");
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

const modelOf = (root: string) => Effect.runPromiseExit(Effect.provide(Compiler.model, nodeSource(root)));
const problemsOf = (exit: Exit.Exit<unknown, unknown>): ReadonlyArray<string> => {
  const error = Exit.isFailure(exit) ? exit.cause.reasons.map((r) => (r as { error?: unknown }).error).find((e) => e instanceof BlueprintInvalid) : undefined;
  return error instanceof BlueprintInvalid ? error.problems : [];
};
const valueOf = <A,>(exit: Exit.Exit<A, unknown>): A => {
  if (!Exit.isSuccess(exit)) throw new Error(`the model should compile: ${problemsOf(exit).join("; ") || String(exit.cause)}`);
  return exit.value;
};

const THING = (lives = "") => `import { Blueprint } from "orthograph";
export const Handle = Blueprint.thing({ description: "A name someone holds.", code: "HD", ${lives}fields: { id: Blueprint.id("hdl"), name: Blueprint.text({ max: 40 }), owner: Blueprint.text({ max: 40 }) } });\n`;
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
const ERRORS = `import { Blueprint } from "orthograph";
export class HandleTaken extends Blueprint.error({}, { exit: 10 }) {}
export class HandleBusy extends Blueprint.error({}, { exit: 11 }) {}\n`;
const NONE = "export {};\n";
const RULES = (body: string) => `import { Blueprint } from "orthograph";
import { Handle } from "./thing.ts";
import { machine } from "./machine.ts";
import { HandleTaken, HandleBusy } from "./errors.ts";
void machine; void HandleTaken; void HandleBusy;
${body}\n`;
const VERB = (name: string, extra: { move?: string; steps?: string; errors?: string } = {}) => `import { Blueprint } from "orthograph";
import { Handle } from "../thing.ts";
import { machine } from "../machine.ts";
import { HandleTaken } from "../errors.ts";
void machine; void HandleTaken;
export default Blueprint.operation(Handle, {
  description: "${name}",
  payload: { name: Handle.fields.name, owner: Handle.fields.owner },
  answer: {},
  ${extra.move ? `move: machine.moves.${extra.move},\n  ` : ""}${extra.errors ? `errors: [${extra.errors}],\n  ` : ""}allowed: [Blueprint.anyone],
  steps: { s: ${extra.steps ?? "Blueprint.step.database()"} },
});\n`;

let n = 0;
/** `null` leaves a default file out (a thing with no machine has no machine.ts, not an empty one). */
const project = (files: Readonly<Record<string, string | null>>): string => {
  mkdirSync(scratch, { recursive: true });
  const root = mkdtempSync(join(scratch, `p${n++}-`));
  const all: Record<string, string | null> = { "things/handle/thing.ts": THING(), "things/handle/machine.ts": MACHINE, "things/handle/events.ts": EVENTS, "things/handle/errors.ts": ERRORS, ...files };
  for (const [path, text] of Object.entries(all)) {
    if (text === null) continue;
    mkdirSync(dirname(join(root, "blueprint", path)), { recursive: true });
    writeFileSync(join(root, "blueprint", path), text);
  }
  return root;
};
const FILE = "blueprint/things/handle/invariants.ts";

type Files = Record<string, string | null>;
interface Model {
  things: Record<string, { hash?: string; invariants?: Record<string, { kind: string; fields: string[]; while?: string[]; refuse?: string; description?: string }> }>;
  operations: Record<string, { invariants?: Record<string, string>; refusals: string[]; errors: string[] }>;
}
const model = async (files: Files) => valueOf(await modelOf(project(files))) as unknown as Model;
const hashOf = async (files: Files) => (await model(files)).things["handle"]?.hash;

describe("G5 control: a thing with no invariants.ts", () => {
  it("compiles, carries no `invariants`, and its operations attach none", async () => {
    const m = await model({ "things/handle/verbs/claim.ts": VERB("claim", { move: "claim" }) });
    expect(m.things["handle"]?.invariants ?? {}).toEqual({});
    expect(m.operations["handle.claim"]?.invariants ?? {}).toEqual({});
  });
});

describe("G5: the model carries each rule", () => {
  it("one field, a tuple, and a rule with no `while`, `refuse` or `description`", async () => {
    const m = await model({
      "things/handle/invariants.ts": RULES(`export const oneHolder = Blueprint.invariant.unique(Handle.fields.name, { while: [machine.states.claimed], refuse: HandleTaken });
export const pair = Blueprint.invariant.unique([Handle.fields.name, Handle.fields.owner]);`),
    });
    expect(m.things["handle"]?.invariants).toEqual({
      oneHolder: { kind: "unique", fields: ["name"], while: ["claimed"], refuse: "HandleTaken" },
      pair: { kind: "unique", fields: ["name", "owner"] },
    });
  });

  it("the rules are part of the thing's hash, and so are their scope, refusal and description", async () => {
    const one = (opts: string) => hashOf({ "things/handle/invariants.ts": RULES(`export const r = Blueprint.invariant.unique(Handle.fields.name, ${opts});`) });
    const hashes = await Promise.all([
      one("{ while: [machine.states.claimed] }"),
      one("{ while: [machine.states.claimed, machine.states.released] }"),
      one("{ while: [machine.states.claimed], refuse: HandleTaken }"),
      one('{ while: [machine.states.claimed], description: "x" }'),
      hashOf({}),
    ]);
    expect(new Set(hashes).size, "five different declarations, five hashes").toBe(5);
  });
});

describe("G5: which operations can break a rule (section 3)", () => {
  const rule = `export const oneHolder = Blueprint.invariant.unique(Handle.fields.name, { while: [machine.states.claimed], refuse: HandleTaken });`;
  const verbs: Files = {
    "things/handle/verbs/claim.ts": VERB("claim", { move: "claim" }),
    "things/handle/verbs/release.ts": VERB("release", { move: "release" }),
    "things/handle/verbs/look.ts": VERB("look"),
    "things/handle/verbs/rewrite.ts": VERB("rewrite", { steps: "Blueprint.step.database({ writes: [Handle] })" }),
  };

  it("a move that can end in a `while` state breaks it; a move that only leaves it and a default step with no move do not", async () => {
    const m = await model({ "things/handle/invariants.ts": RULES(rule), ...verbs });
    expect(m.operations["handle.claim"]?.invariants).toEqual({ HandleTaken: "handle.oneHolder" });
    expect(m.operations["handle.claim"]?.refusals).toContain("HandleTaken");
    for (const quiet of ["handle.release", "handle.look"]) {
      expect(m.operations[quiet]?.invariants ?? {}, quiet).toEqual({});
      expect(m.operations[quiet]?.refusals ?? [], quiet).not.toContain("HandleTaken");
    }
  });

  it("a database step that names the thing in `writes` breaks it, and a refusal is never in `errors`", async () => {
    const m = await model({ "things/handle/invariants.ts": RULES(rule), ...verbs });
    expect(m.operations["handle.rewrite"]?.invariants).toEqual({ HandleTaken: "handle.oneHolder" });
    for (const op of Object.values(m.operations)) expect(op.errors).not.toContain("HandleTaken");
  });

  it("a rule with no `while` is broken by any move, and a thing with no machine by any database step on it that leaves `writes` unset", async () => {
    const anywhere = await model({ "things/handle/invariants.ts": RULES(`export const r = Blueprint.invariant.unique(Handle.fields.name, { refuse: HandleTaken });`), ...verbs });
    expect(anywhere.operations["handle.release"]?.invariants).toEqual({ HandleTaken: "handle.r" });
    const noMachine = await model({
      "things/handle/machine.ts": null,
      "things/handle/events.ts": null,
      "things/handle/invariants.ts": `import { Blueprint } from "orthograph";\nimport { Handle } from "./thing.ts";\nimport { HandleTaken } from "./errors.ts";\nexport const r = Blueprint.invariant.unique(Handle.fields.name, { refuse: HandleTaken });\n`,
      "things/handle/verbs/save.ts": VERB("save").replace('import { machine } from "../machine.ts";\n', "").replace("void machine; ", ""),
    });
    expect(noMachine.operations["handle.save"]?.invariants).toEqual({ HandleTaken: "handle.r" });
  });

  it("a rule with no refusal attaches nothing to any operation", async () => {
    const m = await model({ "things/handle/invariants.ts": RULES(`export const r = Blueprint.invariant.unique(Handle.fields.name);`), ...verbs });
    expect(m.things["handle"]?.invariants?.["r"], "the rule is there").toMatchObject({ kind: "unique", fields: ["name"] });
    for (const op of Object.values(m.operations)) expect(op.invariants ?? {}).toEqual({});
  });
});

describe("G5: the compiler refuses a rule that cannot hold, naming the file", () => {
  const refused = async (files: Files, ...patterns: RegExp[]) => {
    const problems = problemsOf(await modelOf(project(files)));
    expect(problems.length, "the model is refused").toBeGreaterThanOrEqual(1);
    expect(problems.join("\n")).toContain(FILE);
    for (const pattern of patterns) expect(problems.join("\n")).toMatch(pattern);
  };
  const rules = (body: string): Files => ({ "things/handle/invariants.ts": RULES(body) });

  it("a key that is not a field of the thing", () => refused(rules(`export const r = Blueprint.invariant.unique((Handle.fields as never as Record<string, never>)["nickname"]);`), /nickname|field/i));
  it("an empty tuple", () => refused(rules(`export const r = Blueprint.invariant.unique([] as never);`), /key|empty|at least one/i));
  it("a `while` naming a state the machine does not have", () => refused(rules(`export const r = Blueprint.invariant.unique(Handle.fields.name, { while: [(machine.states as Record<string, never>)["ghost"]] });`), /state|ghost/i));
  it("a `while` on a thing with no machine", () => refused({
    "things/handle/machine.ts": null, "things/handle/events.ts": null,
    "things/handle/invariants.ts": `import { Blueprint } from "orthograph";\nimport { Handle } from "./thing.ts";\nexport const r = Blueprint.invariant.unique(Handle.fields.name, { while: ["claimed" as never] });\n`,
  }, /machine|state/i));
  it("a thing that lives as actors, with the real reason and not G4's", async () => {
    const problems = problemsOf(await modelOf(project({
      "things/handle/thing.ts": THING(`lives: "actor", `), "things/handle/machine.ts": null, "things/handle/events.ts": null,
      "things/handle/invariants.ts": `import { Blueprint } from "orthograph";\nimport { Handle } from "./thing.ts";\nexport const r = Blueprint.invariant.unique(Handle.fields.name);\n`,
    }))).join("\n");
    expect(problems).toContain(FILE);
    expect(problems).toMatch(/actor/i);
    expect(problems).toMatch(/Durable Object|own instance|no shared (index|list)/i);
    expect(problems).not.toMatch(/nothing to be unique among/i);
  });
  it("an error owned by two rules", () => refused(rules(`export const a = Blueprint.invariant.unique(Handle.fields.name, { refuse: HandleTaken });\nexport const b = Blueprint.invariant.unique(Handle.fields.owner, { refuse: HandleTaken });`), /HandleTaken/, /more than one|twice|already/i));
  it("an error that is also in a verb's `errors:`, naming the rule and the verb's file", () => refused({
    ...rules(`export const a = Blueprint.invariant.unique(Handle.fields.name, { refuse: HandleTaken });`),
    "things/handle/verbs/claim.ts": VERB("claim", { move: "claim", errors: "HandleTaken" }),
  }, /HandleTaken is refused by the runtime for handle\.a/, /take it out of `errors`/, /verbs\/claim\.ts/));
  it("a refusal carrying a field that is not in the key", () => refused({
    "things/handle/errors.ts": `${ERRORS}import { Handle } from "./thing.ts";\nexport class HandleHeld extends Blueprint.error({ owner: Handle.fields.owner }, { exit: 12 }) {}\n`,
    "things/handle/invariants.ts": RULES(`import { HandleHeld } from "./errors.ts";\nexport const a = Blueprint.invariant.unique(Handle.fields.name, { refuse: HandleHeld });`),
  }, /owner/));
  it("a refusal whose exit another refusal the same operation can make already has (a borrowed error from another thing)", () => refused({
    "things/other/thing.ts": `import { Blueprint } from "orthograph";\nexport const Other = Blueprint.thing({ description: "Another.", code: "OT", fields: { id: Blueprint.id("oth") } });\n`,
    "things/other/errors.ts": `import { Blueprint } from "orthograph";\nexport class OtherBusy extends Blueprint.error({}, { exit: 10 }) {}\n`,
    ...rules(`export const a = Blueprint.invariant.unique(Handle.fields.name, { refuse: HandleTaken });`),
    "things/handle/verbs/claim.ts": VERB("claim", { move: "claim" }).replace("allowed:", "errors: [OtherBusy],\n  allowed:").replace('import { machine }', 'import { OtherBusy } from "../../other/errors.ts";\nimport { machine }'),
  }, /10/, /HandleTaken/, /OtherBusy/));
  it("a file in a thing's folder with another name stays refused, and the message lists `invariants`", async () => {
    const odd = problemsOf(await modelOf(project({ "things/handle/rules.ts": NONE }))).join("\n");
    expect(odd).toMatch(/rules\.ts/);
    expect(odd).toMatch(/invariants/);
  });
});
