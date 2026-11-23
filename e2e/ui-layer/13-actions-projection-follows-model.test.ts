// Check 13 (M1.22): the actions are written FROM THE MODEL, by `ortho generate`, every time. Two halves.
//
// A  A fresh `ortho generate` of Plugged In and of acme, in a copy, writes `generated/actions/` byte for byte as it is checked in, so no
//    action is hand-written or left stale. (The mount is the project's own `blueprint/projections/actions.ts`, as the others are.)
// B  A copy of Plugged In whose blueprint is changed in the four ways an action must follow, then generated: an operation's description
//    changed; `needsApproval: true` added to one and taken from another; `.notVia(Via.agent)` on a role (acme's `invitation.accept` has the
//    same), which leaves the operation with NO agent tool; and a new list read with optional fields, whose schema must advertise and validate
//    each as `optionalKey` (the string it accepts, never `anyOf` null), required nowhere.
//    Every expected value is read from the copy's own model, and the changes are the literals written below.
//
// Written before the projection exists: the mount is missing, so nothing is written, and every test says which file it could not find.
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { Effect, Schema } from "effect";
import { afterAll, describe, expect, it } from "vitest";
import { loadActions } from "./contract.ts";
import { type ModelOp, actionFile, exampleRoot, hostOf, loadModule, loadSdk, modelAt, opsOf, sink, walk, wantOptions } from "./projection.ts";
import * as L from "../m1/loop.ts";

const cleanup: Array<() => unknown> = [];
afterAll(() => { for (const stop of cleanup.splice(0).reverse()) stop(); });

const textAt = (root: string, path: string) => readFileSync(join(root, path), "utf8");

describe("13 A M1.22: generated/actions/ is what ortho generate writes", () => {
  for (const example of ["plugged-in", "acme"] as const) {
    it(`${example}: a fresh generate writes the same files, byte for byte, as are checked in, and every operation has one`, () => {
      const checkedIn = exampleRoot(example);
      const copy = L.freshProject(checkedIn);
      cleanup.push(copy.remove);
      const want = opsOf(modelAt(checkedIn)).map((op) => actionFile(op)).sort();
      const fresh = walk(copy.root, "generated/actions");
      expect(fresh, "what `ortho generate` writes").toEqual(want);
      const have = walk(checkedIn, "generated/actions");
      expect(have, "what is checked in").toEqual(fresh);
      expect(have.filter((path) => textAt(copy.root, path) !== textAt(checkedIn, path)), "files that differ").toEqual([]);
    }, 300_000);
  }
});

// ---- B: a copy of Plugged In, changed ----

const SDESC = "Claim a name (check 13's own words).";
const LIST = `import { Blueprint } from "orthograph";
import { Link } from "../thing.ts";

// Check 13's list read: filters and a cursor are optional in its payload.
export default Blueprint.read(Link, { where: ["state"], order: "oldest", page: 10, allowed: [Blueprint.anyone] });
`;

const overlay = () => {
  const source = exampleRoot("plugged-in");
  const dir = mkdtempSync(join(tmpdir(), "ortho-ui-layer-13-"));
  cleanup.push(() => rmSync(dir, { recursive: true, force: true }));
  const put = (path: string, change: (text: string) => string) => {
    const text = readFileSync(existsSync(join(dir, path)) ? join(dir, path) : join(source, path), "utf8");
    const changed = change(text);
    if (changed === text && !path.endsWith("list.ts")) throw new Error(`check 13's overlay changed nothing in ${path}`);
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), changed);
  };
  put("blueprint/things/handle/verbs/claim.ts", (t) => t.replace("Claim a free name and make it the address of your public page, with its profile.", SDESC));
  put("blueprint/things/handle/verbs/release.ts", (t) => t.replace('import { Blueprint } from "orthograph";', 'import { Blueprint, Via } from "orthograph";').replace("allowed: [handleOwner]", "allowed: [handleOwner.notVia(Via.agent)]").replace("  needsApproval: true,\n", ""));
  put("blueprint/things/link/verbs/remove.ts", (t) => t.replace("  steps: { record: Blueprint.step.database() },\n", "  steps: { record: Blueprint.step.database() },\n  needsApproval: true,\n"));
  // An operation gains a declared refusal; a read becomes a write (it gains a `record` step), whatever its name says.
  put("blueprint/things/link/verbs/remove.ts", (t) => t.replace('import { Link } from "../thing.ts";', 'import { Link } from "../thing.ts";\nimport { LinkAlreadyRemoved } from "../errors.ts";').replace("  errors: [],", "  errors: [LinkAlreadyRemoved],"));
  put("blueprint/things/profile/verbs/get.ts", (t) => t.replace("steps: { load: Blueprint.step.database({ writes: [] }) },", "steps: { load: Blueprint.step.database({ writes: [] }), record: Blueprint.step.database() },"));
  mkdirSync(join(dir, "blueprint/things/link/verbs"), { recursive: true });
  writeFileSync(join(dir, "blueprint/things/link/verbs/list.ts"), LIST);
  // A read with a write's name, and a list read: the name says nothing, the steps and the move do.
  writeFileSync(join(dir, "blueprint/things/link/verbs/archive.ts"), LIST.replace("Check 13's list read", "Check 13's read called archive"));
  return dir;
};

let changed: { readonly root: string; readonly model: ReturnType<typeof modelAt> } | undefined;
const changedProject = () => {
  if (changed !== undefined) return changed;
  const copy = L.freshProject(exampleRoot("plugged-in"), overlay());
  cleanup.push(copy.remove);
  changed = { root: copy.root, model: modelAt(copy.root) };
  return changed;
};

const optionsOf = async (root: string, op: ModelOp, url: string) => {
  if (!existsSync(join(root, actionFile(op)))) expect.fail(`${op.name}: ${actionFile(op)} was not written by ortho generate`);
  const { options } = await loadModule(root, op);
  return options!(await hostOf(await loadSdk(root), url));
};

describe("13 B M1.22: the actions follow a changed blueprint", () => {
  it("the copy's model has the four changes, so the checks below judge something (a control, true today)", () => {
    const { model } = changedProject();
    expect(model.operations["handle.claim"]!.description).toBe(SDESC);
    expect([model.operations["link.remove"]!.needsApproval, model.operations["handle.release"]!.needsApproval]).toEqual([true, undefined]);
    expect([model.operations["handle.release"]!.agentTool, model.operations["handle.claim"]!.agentTool]).toEqual([false, true]);
    expect(model.operations["link.remove"]!.refusals, "link.remove gained a declared refusal").toContain("LinkAlreadyRemoved");
    expect(Object.keys(model.operations["profile.get"]!.steps), "profile.get gained a step that writes").toEqual(["load", "record"]);
    expect([model.operations["link.archive"]!.move ?? null, Object.keys(model.operations["link.archive"]!.steps)]).toEqual([null, []]);
    const listed = model.operations["link.list"]!;
    expect(Object.entries(listed.payload).filter(([, f]) => f.optional === true).map(([name]) => name).sort()).toEqual(["cursor", "state"]);
  }, 300_000);

  it("every operation of the changed copy has its action, with the model's description, flags and refusal codes", async () => {
    const { root, model } = changedProject();
    const server = await sink();
    cleanup.push(() => server.close());
    const wrong: Array<string> = [];
    for (const op of opsOf(model)) {
      if (!existsSync(join(root, actionFile(op)))) { wrong.push(`${op.name}: ${actionFile(op)} was not written`); continue; }
      const got = await optionsOf(root, op, server.url);
      const want = wantOptions(model, op);
      for (const [field, value] of Object.entries(want)) {
        if (JSON.stringify((got as unknown as Record<string, unknown>)[field]) !== JSON.stringify(value)) wrong.push(`${op.name}.${field} is ${JSON.stringify((got as unknown as Record<string, unknown>)[field])}, the model says ${JSON.stringify(value)}`);
      }
    }
    expect(wrong).toEqual([]);
  }, 300_000);

  it("the changes themselves reach the actions: the new description, a yes asked of link.remove and not of handle.release, and no agent tool for handle.release", async () => {
    const { root, model } = changedProject();
    const server = await sink();
    cleanup.push(() => server.close());
    const flags = async (name: string) => { const o = await optionsOf(root, model.operations[name]!, server.url); return [o.description, o.needsApproval, o.agentTool, o.readOnly]; };
    expect(await flags("handle.claim")).toEqual([SDESC, false, true, false]);
    expect(await flags("link.remove")).toEqual([model.operations["link.remove"]!.description, true, true, false]);
    expect(await flags("handle.release")).toEqual([model.operations["handle.release"]!.description, false, false, false]);
    expect(await flags("link.list")).toEqual([model.operations["link.list"]!.description, false, true, true]);
    expect(await flags("link.archive")).toEqual([model.operations["link.archive"]!.description, false, true, true]);
    expect(await flags("profile.get")).toEqual([model.operations["profile.get"]!.description, false, true, false]);
    const errors = async (name: string) => (await optionsOf(root, model.operations[name]!, server.url)).errors;
    expect(await errors("link.remove")).toEqual({ LinkNotListed: model.refusals["LinkNotListed"], LinkAlreadyRemoved: model.refusals["LinkAlreadyRemoved"], NotAllowed: "AR-001" });
  }, 300_000);

  it("the registry lists the operation `.notVia(Via.agent)` with agentTool false, and every other with agentTool true", async () => {
    const { root, model } = changedProject();
    const { Actions, defineAction } = await loadActions();
    const server = await sink();
    cleanup.push(() => server.close());
    const actions = [];
    for (const op of opsOf(model)) actions.push(defineAction(await optionsOf(root, op, server.url), { ask: async () => true }));
    const rows = Actions.registry(actions).list();
    expect(rows.filter((r) => !r.agentTool).map((r) => r.name)).toEqual(["handle.release"]);
    expect(rows.filter((r) => r.agentTool).length).toBe(opsOf(model).length - 1);
  }, 300_000);

  it("a list read's optional fields are optionalKey: advertised as the string they accept (no anyOf null), required nowhere, valid left out and refused as null", async () => {
    const { root, model } = changedProject();
    const { Actions, defineAction } = await loadActions();
    const server = await sink();
    cleanup.push(() => server.close());
    const op = model.operations["link.list"]!;
    const options = await optionsOf(root, op, server.url);
    const row = Actions.registry([defineAction(options, { ask: async () => true })]).list()[0]!;
    const optional = Object.entries(op.payload).filter(([, f]) => f.optional === true).map(([name]) => name);
    expect(optional.length).toBeGreaterThan(0);
    const schema = row.inputSchema as { properties?: Record<string, Record<string, unknown>>; required?: ReadonlyArray<string> };
    const wrong: Array<string> = [];
    for (const field of optional) {
      const advertised = schema.properties?.[field];
      if (advertised === undefined) { wrong.push(`${field} is not advertised`); continue; }
      if (JSON.stringify(advertised).includes('"null"')) wrong.push(`${field} is advertised as accepting null: ${JSON.stringify(advertised)}`);
      if (advertised["type"] !== "string" && !Array.isArray(advertised["enum"])) wrong.push(`${field} is advertised as ${JSON.stringify(advertised)}, not as a string it accepts`);
      if ((schema.required ?? []).includes(field)) wrong.push(`${field} is required`);
    }
    const decode = (input: unknown) => Effect.runSync(Schema.decodeUnknownEffect(options.schema)(input).pipe(Effect.match({ onFailure: () => "refused" as const, onSuccess: () => "accepted" as const })));
    const required = Object.keys(op.payload).filter((f) => op.payload[f]!.optional !== true);
    const base = Object.fromEntries(required.map((f) => [f, "x"]));
    if (decode(base) !== "accepted") wrong.push(`a payload with no optional field is ${decode(base)}`);
    for (const field of optional) if (decode({ ...base, [field]: null }) !== "refused") wrong.push(`${field}: null is accepted, and the schema advertises no null`);
    expect(wrong).toEqual([]);
  }, 300_000);
});
