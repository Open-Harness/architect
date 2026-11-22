// Check 01 (M1.23): what `orthograph/actions` does with a call that does not succeed. A call the role check refuses writes nothing and is
// returned as the typed `ActionRefusal` agent-native reads by its members; a failure that is not a declared refusal is a plain error with
// nothing of the defect on it. Written before the module exists, by an author who builds none of it; the contract is `contract.ts`.
//
// There are no generated actions yet (Goal 5 slice 3), so the actions are `stand-in/actions.ts`: hand-written in the exact shape of K29
// section 3.1, calling a stand-in SDK that makes real HTTP calls to a real server (`stand-in/worker.ts`) which keeps its own record of every
// write. "Writes nothing" is read from that record, never from a returned value. Every expected value is written here, never read back.
//
// Red today because `orthograph/actions` does not exist: each test fails at its first line, the import.
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { type ActionRefusalShape, loadActions } from "./contract.ts";
import { noteAdd, noteExport, noteRemove } from "./stand-in/actions.ts";
import { SECRET } from "./stand-in/worker.ts";
import { ADD, REMOVE, expectRedacted, expectRefusal, rejection, rig, useWorker } from "./support.ts";

const w = useWorker();

describe("01 M1.23: refusals and defects", () => {
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
      await expectRefusal(refusal, "PR-001", { remaining: 0 });
      expect(refusal.message).toBe("Sold out");
      expect(refusal.name).toBe("ActionRefusal");
      await expectRefusal(new ActionRefusal("Nope", "AR-001"), "AR-001", undefined);
    });
  });

  describe("a refusal writes nothing and is returned typed", () => {
    for (const via of ["the generated options.run", "the defineAction wrapper"] as const) {
      it(`${via}: the role check refuses a viewer with AR-001, and the Worker holds no write`, async () => {
        const { actions, host, approver } = await rig(w.current, "viewer");
        const options = noteAdd(host);
        const run = via === "the defineAction wrapper" ? actions.defineAction(options, approver).run : options.run;
        const error = await rejection(run(ADD));
        await expectRefusal(error, "AR-001", {});
        expect(w.current.writes).toHaveLength(0);
      });
    }

    it("the same call by an editor writes once, so an empty record above means the refusal wrote nothing, not that nothing is counted", async () => {
      const { host } = await rig(w.current, "editor");
      await noteAdd(host).run(ADD);
      expect(w.current.writes.map((write) => [write.path, write.body.text])).toEqual([["/notes/add", "buy milk"]]);
    });

    it("a refusal the operation declares carries its own code and its own fields as details, and writes nothing", async () => {
      const { host } = await rig(w.current, "editor");
      const error = await rejection(noteAdd(host).run({ room: "full", text: "one more" }));
      await expectRefusal(error, "NT-001", { remaining: 0 });
      expect(w.current.writes).toHaveLength(0);
    });

    it("a refusal of an action that needsApproval, called without the wrapper, writes nothing and is typed the same way", async () => {
      const { host } = await rig(w.current, "viewer");
      const error = await rejection(noteRemove(host).run(REMOVE));
      await expectRefusal(error, "AR-001", {});
      expect(w.current.writes).toHaveLength(0);
    });
  });

  describe("a failure that is not a refusal is a plain error, redacted", () => {
    it("a Worker that answers 500 with a secret in its message: a plain Error, no member of a refusal, no secret anywhere on it", async () => {
      const { actions, host, approver } = await rig(w.current, "editor");
      const options = noteExport(host);
      expectRedacted(await rejection(options.run({ room: "kitchen", format: "csv" })));
      expectRedacted(await rejection(actions.defineAction(options, approver).run({ room: "kitchen", format: "csv" })));
    });

    it("runForAction: a defect, a failed Error and a failed string are plain errors, whatever their message says", async () => {
      const { runForAction } = await loadActions();
      expectRedacted(await rejection(runForAction(Effect.die(new Error(SECRET)))));
      expectRedacted(await rejection(runForAction(Effect.die(new Error("token sk_live_4242 was rejected by 10.0.0.7:5432")))));
      expectRedacted(await rejection(runForAction(Effect.fail(new Error("token sk_live_4242 was rejected by 10.0.0.7:5432")))));
      expectRedacted(await rejection(runForAction(Effect.fail(new Error("x", { cause: new Error(SECRET) })))));
      expectRedacted(await rejection(runForAction(Effect.fail("token sk_live_4242"))));
    });

    it("runForAction: only a failure with a declared tag is a refusal; a tag with no code, a code with no tag, and a system error's code are not", async () => {
      const { runForAction } = await loadActions();
      const leaky = { _tag: "Weird", message: "token sk_live_4242" };
      expectRedacted(await rejection(runForAction(Effect.fail(leaky))));
      expectRedacted(await rejection(runForAction(Effect.fail({ code: "NT-001", message: "token sk_live_4242" }))));
      expectRedacted(await rejection(runForAction(Effect.fail(Object.assign(new Error("connect to 10.0.0.7:5432 failed"), { code: "ECONNREFUSED" })))));
    });

    it("runForAction: a declared refusal is typed with the code it carries and the rest of its fields, and a value passes through", async () => {
      const { runForAction } = await loadActions();
      await expectRefusal(await rejection(runForAction(Effect.fail({ _tag: "IdempotencyConflict", key: "k1" }))), "AR-002", { key: "k1" });
      await expectRefusal(await rejection(runForAction(Effect.fail({ _tag: "NotAllowed" }))), "AR-001", {});
      await expectRefusal(await rejection(runForAction(Effect.fail({ _tag: "SoldOut", code: "PR-001", message: "Sold out", left: 0 }))), "PR-001", { left: 0 });
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

    it("a signal aborted while the call is running interrupts it, and the call ends", async () => {
      const { runForAction } = await loadActions();
      const controller = new AbortController();
      const running = rejection(runForAction(Effect.never, { signal: controller.signal }));
      await Promise.resolve();
      controller.abort();
      const error = await running;
      expect(error).toBeInstanceOf(Error);
      expect((error as Partial<ActionRefusalShape>).actionContractError).not.toBe(true);
    });

    it("the signal and the call's ids reach run through the wrapper: the Worker sees the request key, and an aborted signal stops the call", async () => {
      const { actions, host, approver } = await rig(w.current, "editor");
      const action = actions.defineAction(noteAdd(host), approver);
      await action.run(ADD, { caller: "tool", toolCallId: "toolu_9" });
      expect(w.current.writes.map((write) => write.requestKey)).toEqual(["tool:toolu_9"]);
      const controller = new AbortController();
      controller.abort();
      const stopped = await rejection(action.run(ADD, { caller: "tool", toolCallId: "toolu_10", signal: controller.signal }));
      expect(stopped).toBeInstanceOf(Error);
      // A request an interrupted call had already begun may still reach the Worker: let it land before the next check starts.
      await w.current.settle();
    });
  });

});
