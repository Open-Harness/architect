// Slice 8: "a blocked command fails by name". Settings' `blocked` is a list of program names (GOAL17-check-harness call 4).
import { Blueprint, emits, expect } from "orthograph";
import { models, sandbox } from "../kit/doors.ts";
import { ticketAccept, settingsSave, listed } from "../kit/ops.ts";
import { acceptOf, executorOf, turnBash, turnSay } from "../kit/steps.ts";

export default Blueprint.journey("a blocked command fails by name", {
  cast: { gh: listed, ann: Blueprint.signedIn },
  starts: "an-executor-waits",
  steps: (s) => [
    s.step("ann blocks sudo", s.ann.run(settingsSave, { base: 0n, variables: [], blocked: ["sudo"] }), expect((a) => a.revision).toBe(1n)),
    s.step("the executor runs an ordinary command, one that merely names sudo, then the blocked one", models.script({ for: executorOf("ticket/one"), turns: [turnBash("echo fine"), turnBash("echo sudo"), turnBash("sudo ls"), turnSay("Done.")] })),
    s.step("a mention makes a ticket", s.gh.run(ticketAccept, acceptOf(s, { agent: s.world.executor }))),
    s.step("the world settles", s.clock.settle()),
    s.step("the bridge refused the one blocked command, by name", sandbox.seen({}),
      expect((a) => a.sandboxes.map((b: { refusals: Array<{ name: string; detail: string }> }) => b.refusals.map((r) => [r.name, r.detail.includes("sudo")]))).toEqual([[["BlockedCommand", true]]])),
    s.step("the ordinary commands ran and exited 0, the one naming sudo among them; the blocked one exited 126", sandbox.seen({}),
      expect((a) => a.sandboxes[0].execs.map((e: { command: Array<string>; exit: number | null }) => [e.command[0], e.command[1], e.exit])).toEqual([["echo", "fine", 0], ["echo", "sudo", 0], ["sudo", "ls", 126]])),
    s.step("the model read the name, in the one request that follows the blocked command", models.seen({ containing: "BlockedCommand: sudo" }), expect((a) => a.requests.length).toBe(1)),
    s.step("every scripted turn was used", models.done({}), expect((a) => a.unused).toBe(0)),
  ],
});
