import { resolve } from "node:path";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { Compiler, nodeSource } from "@orthograph/compiler";
import { Journeys } from "./service.ts";

const acme = resolve(import.meta.dirname, "../../../../../examples/acme");

describe("loading a project", () => {
  it("finds acme's journeys, its starting worlds, and the very declarations they import", async () => {
    const project = await Effect.runPromise(Compiler.model.pipe(Effect.provide(nodeSource(acme)), Effect.flatMap((m) => Journeys.load(acme, m))));
    expect(project.journeys.map((j) => j.name).sort()).toEqual([
      "a key and a session are the same person", "an agent cannot consent for a person", "an agent passes the owner rule", "an invitation is used once",
      "an outsider cannot revoke", "an owner makes an api key", "grant an allowance", "health is up", "invite and accept", "read an allowance",
      "revoke then spend", "sign up and sign in", "spend twice with one request", "spend within an allowance", "the system is nobody signed in",
    ]);
    expect([...project.startingWorlds.keys()].sort()).toEqual(["founded", "funded", "invited"]);
    const grant = (await import(resolve(acme, "blueprint/things/allowance/verbs/grant.ts"))).default;
    expect(project.operations.get("allowance.grant")).toBe(grant);
    expect([...project.things.keys()].sort()).toEqual(["allowance", "api-key", "invitation", "membership", "organization", "person", "session", "system"]);
  });
});

// `lacks` (M2.02): none of the named operations is in a `.tools()` answer. It never passes by saying nothing; each case below is a plausible wrong
// answer, and the ones marked "must fail" are the plants that stop a hollow pass.
describe("lacks, on a .tools() call", () => {
  const accept = { marker: "accept" };
  const createKey = { marker: "createKey" };
  const names = new Map<unknown, string>([[accept, "invitation.accept"], [createKey, "api-key.create"]]);
  const judge = async (assertion: { readonly operations: ReadonlyArray<unknown> }, answer: { readonly status: number; readonly body: unknown }, named = true) => {
    const call = { journey: "j", step: "s", actor: "a", person: "p", operation: "tools/list", payload: {}, status: answer.status, body: answer.body, trace: "", parent: "", mayCall: true, journal: [] } as never;
    const world = { facts: { record: () => Effect.succeed(null), journal: () => Effect.succeed([]) }, tableOf: () => undefined, ...(named ? { nameOf: (op: unknown) => names.get(op) } : {}) };
    const { runChecks } = await import("./internal/checks.ts");
    return (await Effect.runPromise(runChecks([{ kind: "lacks", ...assertion } as never], call, {}, world as never))).failures;
  };
  const listed = (...tools: ReadonlyArray<string>) => ({ status: 200, body: { tools } });

  it("passes when none of them is listed, whatever else is", async () => {
    expect(await judge({ operations: [accept, createKey] }, listed("invitation.send", "session.show"))).toEqual([]);
  });
  it("fails when one is listed, and names it", async () => {
    expect(await judge({ operations: [accept, createKey] }, listed("invitation.send", "api-key.create"))).toEqual(["tools list holds api-key.create"]);
  });
  it("fails when all are listed", async () => {
    expect(await judge({ operations: [accept, createKey] }, listed("invitation.accept", "api-key.create"))).toHaveLength(1);
  });
  it("must fail on an operation the project does not declare (it would be absent from any list)", async () => {
    expect(await judge({ operations: [accept, { marker: "stranger" }] }, listed("invitation.send"))).toEqual(["lacks names an operation the project does not declare"]);
  });
  it("must fail when the runner names no operations at all (a runner that passes no `nameOf`)", async () => {
    expect(await judge({ operations: [accept] }, listed("invitation.send"), false)).toEqual(["lacks names an operation the project does not declare"]);
  });
  it("must fail when it names no operation", async () => {
    expect(await judge({ operations: [] }, listed("invitation.send"))).toEqual(["lacks names no operation"]);
  });
  it("must fail on a call that did not answer a tools list: a refusal, an error, or an answer with no `tools`", async () => {
    expect(await judge({ operations: [accept] }, { status: 401, body: { error: "unauthorized" } })).toHaveLength(1);
    expect(await judge({ operations: [accept] }, { status: 200, body: { organization: "org_1" } })).toHaveLength(1);
    expect(await judge({ operations: [accept] }, { status: 200, body: { tools: "invitation.send" } })).toHaveLength(1);
  });
});

// `has` is `lacks` turned over: every named operation is in the tools list. Same rules against a hollow pass.
describe("has, on a .tools() call", () => {
  const send = { marker: "send" };
  const show = { marker: "show" };
  const names = new Map<unknown, string>([[send, "invitation.send"], [show, "session.show"]]);
  const judge = async (operations: ReadonlyArray<unknown>, answer: { readonly status: number; readonly body: unknown }, named = true) => {
    const call = { journey: "j", step: "s", actor: "a", person: "p", operation: "tools/list", payload: {}, status: answer.status, body: answer.body, trace: "", parent: "", mayCall: true, journal: [] } as never;
    const world = { facts: { record: () => Effect.succeed(null), journal: () => Effect.succeed([]) }, tableOf: () => undefined, ...(named ? { nameOf: (op: unknown) => names.get(op) } : {}) };
    const { runChecks } = await import("./internal/checks.ts");
    return (await Effect.runPromise(runChecks([{ kind: "has", operations } as never], call, {}, world as never))).failures;
  };
  const listed = (...tools: ReadonlyArray<string>) => ({ status: 200, body: { tools } });

  it("passes when all are listed, whatever else is", async () => {
    expect(await judge([send, show], listed("session.show", "invitation.send", "x"))).toEqual([]);
  });
  it("fails when one is missing, and names it", async () => {
    expect(await judge([send, show], listed("session.show"))).toEqual(["tools list lacks invitation.send"]);
  });
  it("must fail on an empty list", async () => {
    expect(await judge([send], listed())).toEqual(["tools list lacks invitation.send"]);
  });
  it("must fail on an undeclared operation, no `nameOf`, no operations, and an answer that is not a tools list", async () => {
    expect(await judge([send, { marker: "stranger" }], listed("invitation.send"))).toEqual(["has names an operation the project does not declare"]);
    expect(await judge([send], listed("invitation.send"), false)).toEqual(["has names an operation the project does not declare"]);
    expect(await judge([], listed("invitation.send"))).toEqual(["has names no operation"]);
    expect(await judge([send], { status: 200, body: { organization: "org_1" } })).toHaveLength(1);
    expect(await judge([send], { status: 401, body: {} })).toHaveLength(1);
  });
});

// A machine's own refusal is tagged `<Thing>Not<FirstState>`. Today `machine.states` is the declared array; ST1.14 (G5 section 1) makes it a record of state references and keeps the
// array as `declared`. The check reads the first declared state in either shape, so it gives acme's tag today and the same tag once the record lands.
describe("a machine's own refusal tag, whichever shape its states have", () => {
  const tagFor = async (machine: unknown) => {
    // What `refuses(machine.notFrom)` builds, written out: this package may not import orthograph at run time.
    const check = { kind: "refuses", error: { kind: "not-from", machine, exit: 40 }, fields: {} };
    const call = { journey: "j", step: "s", actor: "a", person: "p", operation: "o", payload: {}, status: 409, body: { _tag: "AllowanceNotActive" }, trace: "t", parent: "x", mayCall: true, journal: [] } as never;
    const world = { facts: { record: () => Effect.succeed(null), journal: () => Effect.succeed([]) }, tableOf: () => "allowance" };
    const { runChecks } = await import("./internal/checks.ts");
    return Effect.runPromise(runChecks([check as never], call, {}, world as never));
  };
  // acme's real machine, reduced to its thing and its declared states, so every fixture below sets `states` and `declared` itself. That keeps these tests
  // meaningful on today's array and on ST1.14's record, whichever shape acme's machine has when they run.
  const real = async () => {
    const machine = (await import(resolve(acme, "blueprint/things/allowance/machine.ts"))).machine as { readonly thing: unknown; readonly states: unknown; readonly declared?: ReadonlyArray<string> };
    const declared = machine.declared ?? (Array.isArray(machine.states) ? (machine.states as ReadonlyArray<string>) : Object.keys(machine.states as object));
    return { thing: machine.thing, declared };
  };
  const recordOf = (declared: ReadonlyArray<string>) => Object.fromEntries(declared.map((s) => [s, { state: s }]));

  it("acme's allowance machine, as it is: the tag is AllowanceNotActive and the check passes", async () => {
    const machine = (await import(resolve(acme, "blueprint/things/allowance/machine.ts"))).machine;
    expect((await tagFor(machine)).failures).toEqual([]);
  });

  it("the array shape (today's): the same tag", async () => {
    const { thing, declared } = await real();
    expect((await tagFor({ thing, states: declared })).failures).toEqual([]);
  });

  it("the record shape with `declared` (ST1.14): the same tag", async () => {
    const { thing, declared } = await real();
    expect((await tagFor({ thing, states: recordOf(declared), declared })).failures).toEqual([]);
  });

  it("the record shape without `declared`: the same tag, from the record's first key", async () => {
    const { thing, declared } = await real();
    expect((await tagFor({ thing, states: recordOf(declared) })).failures).toEqual([]);
  });

  it("a wrong first state is caught, in either shape: the check does say the tag", async () => {
    const { thing } = await real();
    const wrong = ["revoked", "active"];
    expect((await tagFor({ thing, states: wrong })).failures.join("\n")).toMatch(/expected refused with AllowanceNotRevoked/);
    expect((await tagFor({ thing, states: recordOf(wrong), declared: wrong })).failures.join("\n")).toMatch(/expected refused with AllowanceNotRevoked/);
  });
});
