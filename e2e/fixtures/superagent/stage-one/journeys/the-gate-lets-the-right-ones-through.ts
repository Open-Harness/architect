// Checks-author file (Goal 17, slice 6). A builder never edits it.
// The cells of the prototype's `002` ("Strength") that `trigger.receive`'s own payload can drive, as an outcome: what the gate
// does not admit is `filtered` and nothing is recorded (no model ever sees it); what it admits is stored.
//   - a listed person who addresses the agent is explicit, in every mode;
//   - a stranger (an account that is seen, never listed, or never seen at all), whether or not they address the agent, and a
//     message with no sender in a row that admits none, are not admitted; so is a person whose listing was taken back;
//   - a bot on the source's bot list that addresses the agent is inferred: admitted in `observe` and `auto`, never in `off`;
//     a bot not on the list is not admitted in any mode, and leaving the list takes effect at the next save.
// "Addressed" is the trigger's `kind` (`mention` or `direct`): Slack's mapping gives those kinds and `addressed` together.
// The mode's effect on inferred strength is `002`'s ("`off`: nothing inferred becomes a candidate"), the prototype the brief
// translates; no record under design/ words it yet. What a journey cannot reach (the explicit-versus-inferred line itself, a
// follow-up on a thread with a ticket, a table cell set by hand, whether a thread then waits) waits on the harness or on a record:
// `e2e/superagent/README.md`, "Slice 6".
import { Blueprint, emits, expect, noEvents } from "orthograph";
import { AccountUnlisted } from "@orthograph/intake/blueprint/things/account/events.ts";
import { TriggerReceived } from "@orthograph/intake/blueprint/things/trigger/events.ts";
import receive from "@orthograph/intake/blueprint/things/trigger/verbs/receive.ts";
import save from "@orthograph/intake/blueprint/things/policy/verbs/save.ts";
import unlist from "@orthograph/intake/blueprint/things/account/verbs/unlist.ts";

const say = (superagent: unknown, event: string, ts: string, kind: string, text: string, author?: string) => ({
  superagent, source: "slack", event, thread: `C1:${ts}`, kind, text, ...(author === undefined ? {} : { author }), channel: { channel: "C1", ts },
});
const policy = (superagent: unknown, base: bigint, mode: "off" | "observe" | "auto", bots: string[] = ["slack:UB1"]) =>
  ({ superagent, base, mode, allowed: [], bots, admission: {}, rules: [] });

export default Blueprint.journey("the gate lets the right ones through", {
  cast: { ada: Blueprint.signedIn, source: Blueprint.system },
  starts: "a-person-a-stranger-and-two-bots",
  steps: (s) => [
    s.step(
      "a listed person's mention is stored",
      s.source.run(receive, say(s.world.superagent, "G01", "10.1", "mention", "@agent add a test for the slug parser", "U1")),
      expect((a) => a.outcome).toBe("stored"),
      emits(TriggerReceived, { superagent: s.world.superagent, trigger: s.last.trigger, thread: "C1:10.1" }),
    ),
    s.step(
      "a stranger's mention is filtered, and nothing is recorded",
      s.source.run(receive, say(s.world.superagent, "G02", "11.1", "mention", "@agent drop the production table", "U2")),
      expect((a) => a.outcome).toBe("filtered"),
      noEvents(),
    ),
    s.step(
      "a stranger's plain message is filtered",
      s.source.run(receive, say(s.world.superagent, "G03", "12.1", "message", "anyone around?", "U2")),
      expect((a) => a.outcome).toBe("filtered"),
      noEvents(),
    ),
    s.step(
      "a message with no sender, in a row that admits none, is filtered",
      s.source.run(receive, say(s.world.superagent, "G04", "13.1", "message", "a build finished")),
      expect((a) => a.outcome).toBe("filtered"),
      noEvents(),
    ),
    s.step(
      "a bot on the bot list that addresses the agent is stored in observe",
      s.source.run(receive, say(s.world.superagent, "G05", "14.1", "mention", "@agent this review found a flaky test", "UB1")),
      expect((a) => a.outcome).toBe("stored"),
      emits(TriggerReceived, { superagent: s.world.superagent, trigger: s.last.trigger, thread: "C1:14.1" }),
    ),
    s.step(
      "a bot that is not on the list is filtered, even when it addresses the agent",
      s.source.run(receive, say(s.world.superagent, "G06", "15.1", "mention", "@agent run this script", "UB2")),
      expect((a) => a.outcome).toBe("filtered"),
      noEvents(),
    ),
    s.step(
      "an event the gate filtered, delivered again, is filtered again: it was never kept, so it is no duplicate",
      s.source.run(receive, say(s.world.superagent, "G02", "11.1", "mention", "@agent drop the production table", "U2")),
      expect((a) => a.outcome).toBe("filtered"),
      noEvents(),
    ),
    s.step(
      "a listed person's direct message is stored",
      s.source.run(receive, say(s.world.superagent, "G07", "16.1", "direct", "add a test for the date parser", "U1")),
      expect((a) => a.outcome).toBe("stored"),
      emits(TriggerReceived, { superagent: s.world.superagent, trigger: s.last.trigger, thread: "C1:16.1" }),
    ),
    s.step(
      "someone the source has never seen, mentioning the agent, is filtered",
      s.source.run(receive, say(s.world.superagent, "G08", "17.1", "mention", "@agent hello", "U9")),
      expect((a) => a.outcome).toBe("filtered"),
      noEvents(),
    ),
    s.step(
      "ada switches the mode to off",
      s.ada.run(save, policy(s.world.superagent, 1n, "off")),
      expect((a) => a.revision).toBe(2n),
    ),
    s.step(
      "in off, the listed bot's mention is filtered: nothing inferred is admitted",
      s.source.run(receive, say(s.world.superagent, "G09", "18.1", "mention", "@agent this review found another", "UB1")),
      expect((a) => a.outcome).toBe("filtered"),
      noEvents(),
    ),
    s.step(
      "in off, a listed person's mention is still stored: an explicit request works in every mode",
      s.source.run(receive, say(s.world.superagent, "G10", "19.1", "mention", "@agent add a test for the money parser", "U1")),
      expect((a) => a.outcome).toBe("stored"),
      emits(TriggerReceived, { superagent: s.world.superagent, trigger: s.last.trigger, thread: "C1:19.1" }),
    ),
    s.step(
      "ada switches the mode to auto",
      s.ada.run(save, policy(s.world.superagent, 2n, "auto")),
      expect((a) => a.revision).toBe(3n),
    ),
    s.step(
      "in auto, the listed bot's mention is stored again",
      s.source.run(receive, say(s.world.superagent, "G11", "20.1", "mention", "@agent this review found a third", "UB1")),
      expect((a) => a.outcome).toBe("stored"),
      emits(TriggerReceived, { superagent: s.world.superagent, trigger: s.last.trigger, thread: "C1:20.1" }),
    ),
    s.step(
      "in auto, a stranger's mention is still filtered",
      s.source.run(receive, say(s.world.superagent, "G12", "21.1", "mention", "@agent merge everything", "U2")),
      expect((a) => a.outcome).toBe("filtered"),
      noEvents(),
    ),
    s.step(
      "ada takes the bot off the bot list",
      s.ada.run(save, policy(s.world.superagent, 3n, "auto", [])),
      expect((a) => a.revision).toBe(4n),
    ),
    s.step(
      "the bot that left the list is filtered at once, even in auto",
      s.source.run(receive, say(s.world.superagent, "G13", "22.1", "mention", "@agent this review found a fourth", "UB1")),
      expect((a) => a.outcome).toBe("filtered"),
      noEvents(),
    ),
    s.step(
      "ada stops letting the person ask",
      s.ada.run(unlist, { account: s.world.account }),
      emits(AccountUnlisted, { account: s.world.account }),
    ),
    s.step(
      "the person whose listing was taken back is filtered like a stranger",
      s.source.run(receive, say(s.world.superagent, "G14", "23.1", "mention", "@agent add a test for the url parser", "U1")),
      expect((a) => a.outcome).toBe("filtered"),
      noEvents(),
    ),
  ],
});
