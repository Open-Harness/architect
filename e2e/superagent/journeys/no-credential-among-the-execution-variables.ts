// Slice 8: "no credential among the execution variables". GOAL17-check-harness call 4: a sandbox's environment is the four the executor
// always registers, then each source's `environment.of`, then Settings' `variables`; a credential is never there. The turn is held, so the
// sandbox is open when its variables are read, and the journey ends with the retire sweep, so the same journey says "nothing is left".
import { Blueprint, expect } from "orthograph";
import { models, sandbox } from "../kit/doors.ts";
import { ticketAccept, settingsSave, superagentRetire, listed } from "../kit/ops.ts";
import { acceptOf, executorOf, turnSay } from "../kit/steps.ts";

// The test environment gives the GitHub adapter this canary as its secret (call 4): it must be nowhere the bridge saw.
const CANARY = "ortho-canary-github-key";
type Env = ReadonlyArray<{ name: string; from: string; value: string }>;
const byName = (env: Env) => [...env].sort((a, b) => (a.name < b.name ? -1 : 1));

export default Blueprint.journey("no credential among the execution variables", {
  cast: { gh: listed, ann: Blueprint.signedIn },
  starts: "an-executor-waits",
  steps: (s) => [
    s.step("ann adds one variable", s.ann.run(settingsSave, { base: 0n, variables: [{ name: "REGION", value: "eu-west", description: "The region the tests run in." }], blocked: [] }), expect((a) => a.revision).toBe(1n)),
    s.step("the executor's turn stays open", models.script({ for: executorOf("ticket/one"), turns: [turnSay("Done.", "before-reply")] })),
    s.step("a mention on issue 12 makes a ticket", s.gh.run(ticketAccept, acceptOf(s, { agent: s.world.executor }))),
    s.step("the world settles", s.clock.settle()),
    s.step("the sandbox's variables are exactly the seven, each from where it should come", sandbox.seen({}),
      expect((a) => byName(a.sandboxes[0].env).map((v) => [v.name, v.from])).toEqual([
        ["GITHUB_NUMBER", "source"], ["GITHUB_REPOSITORY", "source"], ["REGION", "settings"],
        ["SUPERAGENT_BLOCKED_COMMANDS", "built-in"], ["SUPERAGENT_DIR", "built-in"], ["SUPERAGENT_NAME", "built-in"], ["SUPERAGENT_TICKET", "built-in"]])),
    s.step("and their values are the issue's, the settings', the superagent's and the sandbox's own folder", sandbox.seen({}),
      expect((a) => Object.fromEntries(byName(a.sandboxes[0].env).filter((v) => v.name !== "SUPERAGENT_TICKET" && v.name !== "SUPERAGENT_DIR").map((v) => [v.name, v.value]))).toEqual({
        GITHUB_NUMBER: "12", GITHUB_REPOSITORY: "acme/widgets", REGION: "eu-west", SUPERAGENT_BLOCKED_COMMANDS: "", SUPERAGENT_NAME: "coder" }),
      expect((a) => a.sandboxes[0].env.find((v: { name: string }) => v.name === "SUPERAGENT_DIR")?.value === a.sandboxes[0].root).toBe(true)),
    s.step("the canary is nowhere in what the bridge saw", sandbox.seen({}), expect((a) => JSON.stringify(a).includes(CANARY)).toBe(false)),
    s.step("the sandbox is open while its executor works", sandbox.seen({}), expect((a) => a.sandboxes.map((b: { state: string }) => b.state)).toEqual(["open"])),
    s.step("the model is let go: nothing is held while the clock moves", models.release({ hold: "all" })),
    s.step("ann retires the superagent", s.ann.run(superagentRetire, { superagent: s.world.superagent })),
    s.step("the sweep runs", s.clock.advance("1 minute")),
    s.step("its one sandbox is no longer open", sandbox.seen({}), expect((a) => a.sandboxes.map((b: { state: string }) => b.state !== "open")).toEqual([true])),
    s.step("no folder and no process is left", sandbox.left({}), expect((a) => [a.folders.length, a.processes.length]).toEqual([0, 0])),
  ],
});
