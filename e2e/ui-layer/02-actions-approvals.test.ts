// Check 02 (M1.23): approvals. With `needsApproval`, the `defineAction` wrapper asks the host's person once and runs only on a yes; with the
// approval already given by the host (agent-native's `approvedToolCallKey`), `run` runs once and nothing is asked; a no runs nothing. The
// generated `run` itself never waits, so a host that asks first never asks twice (spike finding 6). Every count is read from a counter around
// `run`, a list of what the person was asked, and the Worker's own record of writes. The stand-in actions and the contract are check 01's.
//
// Red today because `orthograph/actions` does not exist.
import { describe, expect, it } from "vitest";
import { type ActionContext, type ApprovalRequest } from "./contract.ts";
import { allOptions, noteRemove } from "./stand-in/actions.ts";
import { SECRET } from "./stand-in/worker.ts";
import { REMOVE, expectRedacted, expectRefusal, rejection, rig, useWorker } from "./support.ts";

const w = useWorker();

describe("02 M1.23: approvals live in the wrapper", () => {
  describe("approvals live in the wrapper, never in run", () => {
    it("needsApproval: the person is asked once, before anything is written, and on a yes run runs once and the write happens", async () => {
      const { actions, host, approver, asked, writesWhenAsked, counted } = await rig(w.current, "editor");
      const { calls, options } = counted(noteRemove(host));
      const answer = await actions.defineAction(options, approver).run(REMOVE);
      expect(asked).toEqual([{ action: "note.remove", description: "Remove a note for good.", args: REMOVE }]);
      expect(writesWhenAsked).toEqual([0]);
      expect(calls.n).toBe(1);
      expect(w.current.writes.map((write) => write.path)).toEqual(["/notes/remove"]);
      expect(answer).toEqual({ ok: true, count: 1 });
    });

    it("a no runs nothing: run is not called, nothing is written, and the call is refused as AR-003 with nothing written", async () => {
      const { actions, host, approver, asked, counted } = await rig(w.current, "editor", false);
      const { calls, options } = counted(noteRemove(host));
      const error = await rejection(actions.defineAction(options, approver).run(REMOVE));
      await expectRefusal(error, "AR-003", {});
      expect(asked).toHaveLength(1);
      expect(calls.n).toBe(0);
      expect(w.current.writes).toHaveLength(0);
    });

    it("approval already given by the host: run runs once, nothing is asked, the write happens", async () => {
      const { actions, host, approver, asked, counted } = await rig(w.current, "editor", false);
      const { calls, options } = counted(noteRemove(host));
      const ctx: ActionContext = { caller: "tool", toolCallId: "toolu_7", approvedToolCallKey: "toolu_7" };
      await actions.defineAction(options, approver).run(REMOVE, ctx);
      expect(asked).toHaveLength(0);
      expect(calls.n).toBe(1);
      expect(w.current.writes).toHaveLength(1);
    });

    it("an approval covers its own call only: the next call without one asks again, and two asks make two answers", async () => {
      const { actions, host, approver, asked, counted } = await rig(w.current, "editor");
      const { calls, options } = counted(noteRemove(host));
      const action = actions.defineAction(options, approver);
      await action.run(REMOVE, { caller: "tool", toolCallId: "toolu_1", approvedToolCallKey: "toolu_1" });
      await action.run(REMOVE, { caller: "tool", toolCallId: "toolu_2" });
      await action.run(REMOVE);
      expect(asked).toHaveLength(2);
      expect(calls.n).toBe(3);
      expect(w.current.writes).toHaveLength(3);
    });

    it("an action that does not declare needsApproval never asks, even of a person who would say no", async () => {
      const { actions, host, approver, asked, counted } = await rig(w.current, "editor", false);
      for (const options of allOptions(host).filter((o) => !o.needsApproval)) {
        const { calls, options: counting } = counted(options);
        const before = w.current.writes.length;
        const call = actions.defineAction(counting, approver).run({ room: "kitchen", text: "buy milk", noteId: "n1", format: "csv" } as never);
        if (options.name === "note.export") expectRedacted(await rejection(call));
        else await call;
        expect(calls.n, options.name).toBe(1);
        expect(w.current.writes.length - before, options.name).toBe(options.readOnly || options.name === "note.export" ? 0 : 1);
      }
      expect(asked).toHaveLength(0);
    });

    it("a yes is given once and a no once: a call asked again after a no asks again and can run, and one asked again after a yes asks again", async () => {
      const { actions, host, approver, asked, counted } = await rig(w.current, "editor", [false, true, true]);
      const { calls, options } = counted(noteRemove(host));
      const action = actions.defineAction(options, approver);
      await expectRefusal(await rejection(action.run(REMOVE, { caller: "tool", toolCallId: "toolu_1" })), "AR-003", {});
      await action.run(REMOVE, { caller: "tool", toolCallId: "toolu_1" });
      await action.run(REMOVE, { caller: "tool", toolCallId: "toolu_1" });
      expect(asked).toHaveLength(3);
      expect(calls.n).toBe(2);
      expect(w.current.writes).toHaveLength(2);
    });

    it("an empty approval key is no approval: the person is asked", async () => {
      const { actions, host, approver, asked } = await rig(w.current, "editor");
      await actions.defineAction(noteRemove(host), approver).run(REMOVE, { caller: "tool", toolCallId: "toolu_1", approvedToolCallKey: "" });
      expect(asked).toHaveLength(1);
    });

    it("defining an action changes nothing of its options, and two wrappers of the same options ask their own people", async () => {
      const { actions, host, approver, asked } = await rig(w.current, "editor");
      const options = noteRemove(host);
      const original = options.run;
      const first = actions.defineAction(options, approver);
      expect(options.run).toBe(original);
      expect(first).not.toBe(options);
      const otherAsked: ApprovalRequest[] = [];
      const second = actions.defineAction(options, { ask: async (r) => (otherAsked.push(r), true) });
      await second.run(REMOVE);
      await first.run(REMOVE);
      expect(asked).toHaveLength(1);
      expect(otherAsked).toHaveLength(1);
    });

    it("the generated options.run itself never waits: with no wrapper there is nobody to ask, and the call goes through", async () => {
      const { host } = await rig(w.current, "editor", false);
      await noteRemove(host).run(REMOVE);
      expect(w.current.writes).toHaveLength(1);
    });

    it("a yes does not lift the role check: a viewer who is approved is still refused, and nothing is written (whether the person is asked first is not pinned)", async () => {
      const { actions, host, approver, asked } = await rig(w.current, "viewer");
      const error = await rejection(actions.defineAction(noteRemove(host), approver).run(REMOVE));
      await expectRefusal(error, "AR-001", {});
      expect(asked.length).toBeLessThanOrEqual(1);
      expect(w.current.writes).toHaveLength(0);
    });

    it("with no person to ask, an action that needsApproval runs nothing", async () => {
      const { actions, host, counted } = await rig(w.current, "editor");
      const { calls, options } = counted(noteRemove(host));
      const error = await rejection(Promise.resolve().then(() => actions.defineAction(options, undefined as never).run(REMOVE)));
      expect(error).toBeInstanceOf(Error);
      expect(calls.n).toBe(0);
      expect(w.current.writes).toHaveLength(0);
    });

    it("the wrapper keeps every field of the options, in agent-native's names, so a host can register it as it is", async () => {
      const { actions, host, approver } = await rig(w.current, "editor");
      for (const options of allOptions(host)) {
        const wrapped = actions.defineAction(options, approver);
        expect({ ...wrapped, run: typeof wrapped.run }).toEqual({ ...options, run: "function" });
      }
    });

    it("a defect inside an approved call is redacted by the wrapper, whatever its message says and whatever members it carries", async () => {
      const { actions, approver, host } = await rig(w.current, "editor");
      const base = noteRemove(host);
      const thrown = [
        new Error(SECRET),
        new Error("token sk_live_4242 was rejected by 10.0.0.7:5432"),
        Object.assign(new Error("token sk_live_4242 was rejected"), { errorCode: "XX-001", statusCode: 422, details: { at: "10.0.0.7:5432" } }),
        Object.assign(new Error("token sk_live_4242 was rejected"), { actionContractError: true, noWrite: true, errorCode: "XX-001", statusCode: 422 }),
        new Error("x", { cause: new Error("token sk_live_4242") }),
      ];
      for (const error of thrown) expectRedacted(await rejection(actions.defineAction({ ...base, run: () => Promise.reject(error) }, approver).run(REMOVE)));
    });
  });

});
