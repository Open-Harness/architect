// Slice 8: "a write outside the sandbox refused". GOAL17-check-harness call 4: the refusal is `OutsideSandbox`, and the model reads its name.
import { Blueprint, expect } from "orthograph";
import { models, sandbox } from "../kit/doors.ts";
import { ticketAccept, listed } from "../kit/ops.ts";
import { acceptOf, executorOf, turnSay } from "../kit/steps.ts";

const outside = { call: [{ tool: "write", args: { path: "../../outside.txt", content: "x" } }] };
const inside = { call: [{ tool: "write", args: { path: "notes.txt", content: "ok" } }] };

export default Blueprint.journey("a write outside the sandbox is refused", {
  cast: { gh: listed },
  starts: "an-executor-waits",
  steps: (s) => [
    s.step("the executor writes inside its folder, then outside it", models.script({ for: executorOf("ticket/one"), turns: [inside, outside, turnSay("Done.")] })),
    s.step("a mention makes a ticket", s.gh.run(ticketAccept, acceptOf(s, { agent: s.world.executor }))),
    s.step("the world settles", s.clock.settle()),
    s.step("the bridge refused exactly the one write, by name, in one sandbox",
      sandbox.seen({}), expect((a) => a.sandboxes.map((b: { refusals: Array<{ name: string }> }) => b.refusals.map((r) => r.name))).toEqual([["OutsideSandbox"]])),
    s.step("the refusal says which path and which root", sandbox.seen({}),
      expect((a) => a.sandboxes[0].refusals[0].detail.includes("outside.txt") && a.sandboxes[0].refusals[0].detail.includes(a.sandboxes[0].root)).toBe(true)),
    s.step("the model read the refusal's name, once", models.seen({ containing: "OutsideSandbox:" }), expect((a) => a.requests.length).toBe(1)),
    s.step("the write inside was not refused: the model went on to its third and last request", models.seen({}), expect((a) => a.requests.length).toBe(3)),
    s.step("every scripted turn was used", models.done({}), expect((a) => a.unused).toBe(0)),
  ],
});
