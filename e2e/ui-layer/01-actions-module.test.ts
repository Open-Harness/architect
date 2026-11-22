// Check 01 (M1.23): the actions module, `orthograph/actions`. Written before it exists, by an author who builds none of it.
//
// M1.23's done-when: a generated action refused by the role check writes nothing and returns the typed refusal; one with
// `needsApproval` waits for a yes; with approval already given by its host, `run` runs once and asks nothing; `list` returns
// every generated action with a non-empty input schema.
//
// There are no generated actions yet (Goal 5 slice 3), so the actions are `stand-in/actions.ts`: hand-written in the exact shape of
// K29 section 3.1, calling a stand-in SDK that makes real HTTP calls to a real server (`stand-in/worker.ts`) which keeps its own
// record of every write. "Writes nothing" is read from that record, never from a returned value. The contract the module must
// meet is `contract.ts`. Every expected value below is written here, never read back from the output it judges.
//
// Red today because `orthograph/actions` does not exist: each test fails at its first line, the import.
import { Effect } from "effect";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { type Action, type ActionContext, type ActionOptions, type ActionRefusalShape, type ActionsModule, type ApprovalRequest, loadActions } from "./contract.ts";
import { allOptions, makeHost, noteAdd, noteExport, noteRemove } from "./stand-in/actions.ts";
import { SECRET, startWorker, type Worker } from "./stand-in/worker.ts";

let worker: Worker;
beforeAll(async () => {
  worker = await startWorker();
});
afterAll(async () => {
  await worker.close();
});
beforeEach(() => {
  worker.writes.length = 0;
});

const ADD = { room: "kitchen", text: "buy milk" } as const;
const REMOVE = { room: "kitchen", noteId: "n1" } as const;

/** Everything one check needs: the module, a host calling the Worker as `role`, and a person who answers `answer` and is counted. */
const rig = async (role: "editor" | "viewer", answer = true) => {
  const actions = await loadActions();
  const host = makeHost(actions, worker.url, role);
  const asked: ApprovalRequest[] = [];
  const writesWhenAsked: number[] = [];
  const approver = {
    ask: async (request: ApprovalRequest) => {
      asked.push(request);
      writesWhenAsked.push(worker.writes.length);
      return answer;
    },
  };
  /** The action's options with `run` counted, so "runs once" is read from a count and not from the answer. */
  const counted = <Args, Answer>(options: ActionOptions<Args, Answer>) => {
    const calls = { n: 0 };
    return { calls, options: { ...options, run: (args: Args, ctx?: ActionContext) => (calls.n++, options.run(args, ctx)) } };
  };
  return { actions, host, asked, writesWhenAsked, approver, counted };
};

const rejection = async (promise: Promise<unknown>): Promise<unknown> => {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error("expected the call to reject, and it resolved");
};

/** The shape agent-native reads by duck typing (spike finding 3), with the one refusal this check expects. */
const expectRefusal = (error: unknown, code: string, details: Record<string, unknown> | undefined) => {
  expect(error).toBeInstanceOf(Error);
  const refusal = error as ActionRefusalShape;
  expect(refusal.actionContractError).toBe(true);
  expect(refusal.noWrite).toBe(true);
  expect(refusal.errorCode).toBe(code);
  expect(refusal.statusCode).toBe(422);
  expect(refusal.details).toEqual(details);
  expect(refusal.message.length).toBeGreaterThan(0);
};

/** A plain failure: not a refusal in any member agent-native reads, and its message carries nothing of the defect. */
const expectRedacted = (error: unknown) => {
  expect(error).toBeInstanceOf(Error);
  const failure = error as Error & Partial<ActionRefusalShape>;
  expect(failure.actionContractError).not.toBe(true);
  expect(failure.noWrite).not.toBe(true);
  expect(failure.errorCode).toBeUndefined();
  expect(failure.message.length).toBeGreaterThan(0);
  for (const leak of [SECRET, "hunter2", "postgres", "db.internal"]) expect(failure.message).not.toContain(leak);
};

describe("01 M1.23: the actions module", () => {
  describe("the surface", () => {
    it("orthograph/actions exports defineAction, ActionRefusal, runForAction and Actions.registry", async () => {
      const actions = await loadActions();
      expect(typeof actions.defineAction).toBe("function");
      expect(typeof actions.ActionRefusal).toBe("function");
      expect(typeof actions.runForAction).toBe("function");
      expect(typeof actions.Actions.registry).toBe("function");
    });

    it("an ActionRefusal built by hand has every member agent-native reads, and a status of 422", async () => {
      const { ActionRefusal } = await loadActions();
      const refusal = new ActionRefusal("Sold out", "PR-001", { remaining: 0 });
      expectRefusal(refusal, "PR-001", { remaining: 0 });
      expect(refusal.message).toBe("Sold out");
      expect(refusal.name).toBe("ActionRefusal");
      expectRefusal(new ActionRefusal("Nope", "AR-001"), "AR-001", undefined);
    });
  });

  describe("a refusal writes nothing and is returned typed", () => {
    for (const via of ["the generated options.run", "the defineAction wrapper"] as const) {
      it(`${via}: the role check refuses a viewer with AR-001, and the Worker holds no write`, async () => {
        const { actions, host, approver } = await rig("viewer");
        const options = noteAdd(host);
        const run = via === "the defineAction wrapper" ? actions.defineAction(options, approver).run : options.run;
        const error = await rejection(run(ADD));
        expectRefusal(error, "AR-001", {});
        expect(worker.writes).toHaveLength(0);
      });
    }

    it("the same call by an editor writes once, so an empty record above means the refusal wrote nothing, not that nothing is counted", async () => {
      const { host } = await rig("editor");
      await noteAdd(host).run(ADD);
      expect(worker.writes.map((w) => [w.path, w.body.text])).toEqual([["/notes/add", "buy milk"]]);
    });

    it("a refusal the operation declares carries its own code and its own fields as details, and writes nothing", async () => {
      const { host } = await rig("editor");
      const error = await rejection(noteAdd(host).run({ room: "full", text: "one more" }));
      expectRefusal(error, "NT-001", { remaining: 0 });
      expect(worker.writes).toHaveLength(0);
    });

    it("a refusal of an action that needsApproval, called without the wrapper, writes nothing and is typed the same way", async () => {
      const { host } = await rig("viewer");
      const error = await rejection(noteRemove(host).run(REMOVE));
      expectRefusal(error, "AR-001", {});
      expect(worker.writes).toHaveLength(0);
    });
  });

  describe("a failure that is not a refusal is a plain error, redacted", () => {
    it("a Worker that answers 500 with a secret in its message: a plain Error, no member of a refusal, no secret", async () => {
      const { actions, host, approver } = await rig("editor");
      const options = noteExport(host);
      expectRedacted(await rejection(options.run({ room: "kitchen", format: "csv" })));
      expectRedacted(await rejection(actions.defineAction(options, approver).run({ room: "kitchen", format: "csv" })));
    });

    it("runForAction: a defect, a failed Error and a tagged failure with no code are plain errors; a refusal is not; a value passes through", async () => {
      const { runForAction } = await loadActions();
      expectRedacted(await rejection(runForAction(Effect.die(new Error(SECRET)))));
      expectRedacted(await rejection(runForAction(Effect.fail(new Error(SECRET)))));
      expectRedacted(await rejection(runForAction(Effect.fail({ _tag: "Weird", message: SECRET }))));
      expectRedacted(await rejection(runForAction(Effect.fail(SECRET))));
      expectRefusal(await rejection(runForAction(Effect.fail({ _tag: "IdempotencyConflict", key: "k1" }))), "AR-002", { key: "k1" });
      expect(await runForAction(Effect.succeed(5))).toBe(5);
    });

    it("an aborted signal ends the call as a readable plain error, not as a refusal and not as an interruption message", async () => {
      const { runForAction } = await loadActions();
      const controller = new AbortController();
      controller.abort();
      const error = await rejection(runForAction(Effect.never, { signal: controller.signal }));
      expect(error).toBeInstanceOf(Error);
      const failure = error as Error & Partial<ActionRefusalShape>;
      expect(failure.actionContractError).not.toBe(true);
      expect(failure.message.length).toBeGreaterThan(0);
      expect(failure.message).not.toMatch(/fibers interrupted/i);
    });
  });

  describe("approvals live in the wrapper, never in run", () => {
    it("needsApproval: the person is asked once, before anything is written, and on a yes run runs once and the write happens", async () => {
      const { actions, host, approver, asked, writesWhenAsked, counted } = await rig("editor");
      const { calls, options } = counted(noteRemove(host));
      const answer = await actions.defineAction(options, approver).run(REMOVE);
      expect(asked).toEqual([{ action: "note.remove", description: "Remove a note for good.", args: REMOVE }]);
      expect(writesWhenAsked).toEqual([0]);
      expect(calls.n).toBe(1);
      expect(worker.writes.map((w) => w.path)).toEqual(["/notes/remove"]);
      expect(answer).toEqual({ ok: true, count: 1 });
    });

    it("a no runs nothing: run is not called, nothing is written, and the call is refused as AR-003 with nothing written", async () => {
      const { actions, host, approver, asked, counted } = await rig("editor", false);
      const { calls, options } = counted(noteRemove(host));
      const error = await rejection(actions.defineAction(options, approver).run(REMOVE));
      expectRefusal(error, "AR-003", {});
      expect(asked).toHaveLength(1);
      expect(calls.n).toBe(0);
      expect(worker.writes).toHaveLength(0);
    });

    it("approval already given by the host: run runs once, nothing is asked, the write happens", async () => {
      const { actions, host, approver, asked, counted } = await rig("editor", false);
      const { calls, options } = counted(noteRemove(host));
      const ctx: ActionContext = { caller: "tool", toolCallId: "toolu_7", approvedToolCallKey: "toolu_7" };
      await actions.defineAction(options, approver).run(REMOVE, ctx);
      expect(asked).toHaveLength(0);
      expect(calls.n).toBe(1);
      expect(worker.writes).toHaveLength(1);
    });

    it("an approval covers its own call only: the next call without one asks again, and two asks make two answers", async () => {
      const { actions, host, approver, asked, counted } = await rig("editor");
      const { calls, options } = counted(noteRemove(host));
      const action = actions.defineAction(options, approver);
      await action.run(REMOVE, { caller: "tool", toolCallId: "toolu_1", approvedToolCallKey: "toolu_1" });
      await action.run(REMOVE, { caller: "tool", toolCallId: "toolu_2" });
      await action.run(REMOVE);
      expect(asked).toHaveLength(2);
      expect(calls.n).toBe(3);
      expect(worker.writes).toHaveLength(3);
    });

    it("an action that does not declare needsApproval never asks, even of a person who would say no", async () => {
      const { actions, host, approver, asked, counted } = await rig("editor", false);
      const { calls, options } = counted(noteAdd(host));
      await actions.defineAction(options, approver).run(ADD);
      expect(asked).toHaveLength(0);
      expect(calls.n).toBe(1);
      expect(worker.writes).toHaveLength(1);
    });

    it("the generated options.run itself never waits: with no wrapper there is nobody to ask, and the call goes through", async () => {
      const { host } = await rig("editor", false);
      await noteRemove(host).run(REMOVE);
      expect(worker.writes).toHaveLength(1);
    });

    it("a yes does not lift the role check: a viewer who is approved is still refused, and nothing is written", async () => {
      const { actions, host, approver, asked } = await rig("viewer");
      const error = await rejection(actions.defineAction(noteRemove(host), approver).run(REMOVE));
      expectRefusal(error, "AR-001", {});
      expect(asked.length).toBeLessThanOrEqual(1);
      expect(worker.writes).toHaveLength(0);
    });

    it("with no person to ask, an action that needsApproval runs nothing", async () => {
      const { actions, host, counted } = await rig("editor");
      const { calls, options } = counted(noteRemove(host));
      const error = await rejection(Promise.resolve().then(() => actions.defineAction(options, undefined as never).run(REMOVE)));
      expect(error).toBeInstanceOf(Error);
      expect(calls.n).toBe(0);
      expect(worker.writes).toHaveLength(0);
    });

    it("the wrapper keeps every field of the options, in agent-native's names, so a host can register it as it is", async () => {
      const { actions, host, approver } = await rig("editor");
      for (const options of allOptions(host)) {
        const wrapped = actions.defineAction(options, approver);
        expect({ ...wrapped, run: typeof wrapped.run }).toEqual({ ...options, run: "function" });
      }
    });

    it("a defect inside an approved call is redacted by the wrapper too", async () => {
      const { actions, approver } = await rig("editor");
      const leaky = { ...noteRemove(makeHost(actions, worker.url, "editor")), run: () => Promise.reject(new Error(SECRET)) };
      expectRedacted(await rejection(actions.defineAction(leaky, approver).run(REMOVE)));
    });
  });

  describe("the registry lists every action with its input schema", () => {
    const registry = async (role: "editor" | "viewer" = "editor") => {
      const r = await rig(role);
      const all = allOptions(r.host).map((o) => r.actions.defineAction(o, r.approver)) as ReadonlyArray<Action<any, any>>;
      return { ...r, all, registry: r.actions.Actions.registry(all) };
    };
    const byName = (listed: ReturnType<ActionsModule["Actions"]["registry"]>["list"]) => new Map(listed().map((a) => [a.name, a]));

    it("list returns every registered action once, and no other", async () => {
      const { registry: reg } = await registry();
      expect(reg.list().map((a) => a.name).sort()).toEqual(["note.add", "note.export", "note.list", "note.remove"]);
    });

    it("each listed action carries its description and its flags as declared", async () => {
      const { registry: reg } = await registry();
      const listed = byName(reg.list);
      const flags = (name: string) => {
        const a = listed.get(name);
        return a && [a.description, a.readOnly, a.needsApproval, a.agentTool];
      };
      expect(flags("note.add")).toEqual(["Add a note to a room.", false, false, true]);
      expect(flags("note.remove")).toEqual(["Remove a note for good.", false, true, true]);
      expect(flags("note.list")).toEqual(["List the notes in a room.", true, false, true]);
      expect(flags("note.export")).toEqual(["Export a room's notes.", false, false, false]);
    });

    it("each input schema is a non-empty JSON object schema naming exactly the payload's fields, and exactly its required ones", async () => {
      const { registry: reg } = await registry();
      const listed = byName(reg.list);
      const shape = (name: string) => {
        const schema = listed.get(name)?.inputSchema;
        return schema && [schema.type, Object.keys(schema.properties ?? {}).sort(), [...(schema.required ?? [])].sort()];
      };
      expect(shape("note.add")).toEqual(["object", ["room", "tag", "text"], ["room", "text"]]);
      expect(shape("note.remove")).toEqual(["object", ["noteId", "room"], ["noteId", "room"]]);
      expect(shape("note.list")).toEqual(["object", ["room"], ["room"]]);
      expect(shape("note.export")).toEqual(["object", ["format", "room"], ["format", "room"]]);
      for (const a of reg.list()) expect(Object.keys(a.inputSchema.properties ?? {}).length).toBeGreaterThan(0);
    });

    it("a field of a kind advertises its kind: strings as string, a literal union as its values", async () => {
      const { registry: reg } = await registry();
      const listed = byName(reg.list);
      expect(listed.get("note.add")?.inputSchema.properties?.room).toMatchObject({ type: "string" });
      expect(listed.get("note.export")?.inputSchema.properties?.format).toMatchObject({ type: "string", enum: ["csv", "json"] });
    });

    it("an optional field is advertised as what it accepts: a string, not required, never null", async () => {
      const { registry: reg } = await registry();
      const schema = byName(reg.list).get("note.add")?.inputSchema;
      expect(schema?.required).not.toContain("tag");
      expect(schema?.properties?.tag?.type).toBe("string");
      expect(schema?.properties?.tag?.anyOf).toBeUndefined();
      expect(JSON.stringify(schema?.properties?.tag)).not.toContain("null");
    });

    it("the listing is plain JSON: it survives a round trip through JSON unchanged", async () => {
      const { registry: reg } = await registry();
      expect(JSON.parse(JSON.stringify(reg.list()))).toEqual(reg.list());
    });

    it("get returns the registered action itself, so the registry's calls wait for a yes where one is declared", async () => {
      const { registry: reg, asked } = await registry();
      expect(reg.get("note.nothing")).toBeUndefined();
      await reg.get("note.remove")?.run(REMOVE);
      await reg.get("note.list")?.run({ room: "kitchen" });
      expect(asked.map((a) => a.action)).toEqual(["note.remove"]);
      expect(worker.writes.map((w) => w.path)).toEqual(["/notes/remove"]);
    });
  });
});
