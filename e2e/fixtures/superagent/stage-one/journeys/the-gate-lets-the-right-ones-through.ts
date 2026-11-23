// Checks-author file (Goal 17, slice 6). A builder never edits it.
// The cells of the prototype's `002` ("Strength", "Admission", "Accept mode") that `trigger.receive`'s payload can drive, as an
// outcome (GOAL17-stage-one, calls 2, 7 and 8): what the gate does not admit is `filtered` and nothing is recorded (no model ever
// sees it); what it admits is stored.
//   - a listed person who addresses the agent is explicit, in every mode; a listed person's plain message is the row's `listed`
//     cell, inferred by default, so admitted in `observe` and `auto`, never in `off`;
//   - a stranger (seen and never listed, never seen at all, or no longer listed), addressing or not, and a message with no sender,
//     are the row's `unlisted` and `unnamed` cells, which admit nothing by default; a row that sets `unlisted: "explicit"` admits
//     the stranger's mention in every mode, and one that sets `unnamed: "inferred"` admits a message with no sender in `observe` only;
//   - a bot on the source's bot list that addresses the agent is inferred: admitted in `observe` and `auto`, never in `off`;
//     a bot not on the list is not admitted in any mode, and leaving the list takes effect at the next save.
// What a journey cannot reach (a follow-up on a thread with a ticket, the strength itself) is `22-stage-one-doors`.
import { Blueprint, emits, expect, noEvents } from "orthograph";
import { AccountUnlisted } from "@orthograph/intake/blueprint/things/account/events.ts";
import { TriggerReceived } from "@orthograph/intake/blueprint/things/trigger/events.ts";
import receive from "@orthograph/intake/blueprint/things/trigger/verbs/receive.ts";
import save from "@orthograph/intake/blueprint/things/policy/verbs/save.ts";
import unlist from "@orthograph/intake/blueprint/things/account/verbs/unlist.ts";

const ann = { id: "U1", name: "ann", bot: false };
const eve = { id: "U2", name: "stranger", bot: false };
const ghost = { id: "U9", name: "ghost", bot: false };
const bot1 = { id: "UB1", name: "reviewer-bot", bot: true };
const bot2 = { id: "UB2", name: "other-bot", bot: true };

/** One Slack event as the source's caller hands it over; `mention` and `direct` are the kinds Slack's mapping says address the agent. */
const say = (superagent: unknown, event: string, ts: string, kind: "mention" | "direct" | "message", text: string, actor?: typeof ann) => ({
  superagent, source: "slack", event, thread: `C1:${ts}`, kind, text,
  ...(kind === "message" ? {} : { addressed: kind }), ...(actor === undefined ? {} : { actor }), channel: { channel: "C1", ts },
});
const policy = (superagent: unknown, base: bigint, mode: "off" | "observe" | "auto", bots: string[] = ["slack:UB1"], admission: unknown = {}) =>
  ({ superagent, base, mode, allowed: [], bots, admission, rules: [] });
const cells = { C1: { unlisted: "explicit", unnamed: "inferred" } };

export default Blueprint.journey("the gate lets the right ones through", {
  cast: { ada: Blueprint.signedIn, source: Blueprint.system },
  starts: "a-person-a-stranger-and-two-bots",
  steps: (s) => [
    s.step(
      "a listed person's mention is stored",
      s.source.run(receive, say(s.world.superagent, "G01", "10.1", "mention", "@agent add a test for the slug parser", ann)),
      expect((a) => a.outcome).toBe("stored"),
      emits(TriggerReceived, { superagent: s.world.superagent, trigger: s.last.trigger, thread: "C1:10.1" }),
    ),
    s.step(
      "a stranger's mention is filtered, and nothing is recorded",
      s.source.run(receive, say(s.world.superagent, "G02", "11.1", "mention", "@agent drop the production table", eve)),
      expect((a) => a.outcome).toBe("filtered"),
      noEvents(),
    ),
    s.step(
      "a stranger's plain message is filtered",
      s.source.run(receive, say(s.world.superagent, "G03", "12.1", "message", "anyone around?", eve)),
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
      s.source.run(receive, say(s.world.superagent, "G05", "14.1", "mention", "@agent this review found a flaky test", bot1)),
      expect((a) => a.outcome).toBe("stored"),
      emits(TriggerReceived, { superagent: s.world.superagent, trigger: s.last.trigger, thread: "C1:14.1" }),
    ),
    s.step(
      "a bot that is not on the list is filtered, even when it addresses the agent",
      s.source.run(receive, say(s.world.superagent, "G06", "15.1", "mention", "@agent run this script", bot2)),
      expect((a) => a.outcome).toBe("filtered"),
      noEvents(),
    ),
    s.step(
      "an event the gate filtered, delivered again, is filtered again: it was never kept, so it is no duplicate",
      s.source.run(receive, say(s.world.superagent, "G02", "11.1", "mention", "@agent drop the production table", eve)),
      expect((a) => a.outcome).toBe("filtered"),
      noEvents(),
    ),
    s.step(
      "a listed person's direct message is stored",
      s.source.run(receive, say(s.world.superagent, "G07", "16.1", "direct", "add a test for the date parser", ann)),
      expect((a) => a.outcome).toBe("stored"),
      emits(TriggerReceived, { superagent: s.world.superagent, trigger: s.last.trigger, thread: "C1:16.1" }),
    ),
    s.step(
      "someone the source has never seen, mentioning the agent, is filtered",
      s.source.run(receive, say(s.world.superagent, "G08", "17.1", "mention", "@agent hello", ghost)),
      expect((a) => a.outcome).toBe("filtered"),
      noEvents(),
    ),
    s.step(
      "a listed person's plain message is an inferred candidate: stored in observe",
      s.source.run(receive, say(s.world.superagent, "G09", "18.1", "message", "the login test is flaky again", ann)),
      expect((a) => a.outcome).toBe("stored"),
      emits(TriggerReceived, { superagent: s.world.superagent, trigger: s.last.trigger, thread: "C1:18.1" }),
    ),
    s.step(
      "ada switches the mode to off",
      s.ada.run(save, policy(s.world.superagent, 1n, "off")),
      expect((a) => a.revision).toBe(2n),
    ),
    s.step(
      "in off, the listed bot's mention is filtered: nothing inferred is admitted",
      s.source.run(receive, say(s.world.superagent, "G10", "19.1", "mention", "@agent this review found another", bot1)),
      expect((a) => a.outcome).toBe("filtered"),
      noEvents(),
    ),
    s.step(
      "in off, a listed person's mention is still stored: an explicit request works in every mode",
      s.source.run(receive, say(s.world.superagent, "G11", "20.1", "mention", "@agent add a test for the money parser", ann)),
      expect((a) => a.outcome).toBe("stored"),
      emits(TriggerReceived, { superagent: s.world.superagent, trigger: s.last.trigger, thread: "C1:20.1" }),
    ),
    s.step(
      "in off, a listed person's plain message is filtered: it is inferred",
      s.source.run(receive, say(s.world.superagent, "G12", "21.1", "message", "the money test is flaky too", ann)),
      expect((a) => a.outcome).toBe("filtered"),
      noEvents(),
    ),
    s.step(
      "ada switches the mode to auto",
      s.ada.run(save, policy(s.world.superagent, 2n, "auto")),
      expect((a) => a.revision).toBe(3n),
    ),
    s.step(
      "in auto, the listed bot's mention is stored again",
      s.source.run(receive, say(s.world.superagent, "G13", "22.1", "mention", "@agent this review found a third", bot1)),
      expect((a) => a.outcome).toBe("stored"),
      emits(TriggerReceived, { superagent: s.world.superagent, trigger: s.last.trigger, thread: "C1:22.1" }),
    ),
    s.step(
      "in auto, a stranger's mention is still filtered",
      s.source.run(receive, say(s.world.superagent, "G14", "23.1", "mention", "@agent merge everything", eve)),
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
      s.source.run(receive, say(s.world.superagent, "G15", "24.1", "mention", "@agent this review found a fourth", bot1)),
      expect((a) => a.outcome).toBe("filtered"),
      noEvents(),
    ),
    s.step(
      "ada sets the row's stranger-mention cell to explicit and its no-sender cell to inferred, in off",
      s.ada.run(save, policy(s.world.superagent, 4n, "off", [], cells)),
      expect((a) => a.revision).toBe(5n),
    ),
    s.step(
      "in off, a message with no sender is filtered even where its cell is inferred",
      s.source.run(receive, say(s.world.superagent, "G16", "25.1", "message", "a build finished again")),
      expect((a) => a.outcome).toBe("filtered"),
      noEvents(),
    ),
    s.step(
      "in off, a stranger's mention is stored where the row's cell is explicit: it works in every mode",
      s.source.run(receive, say(s.world.superagent, "G17", "26.1", "mention", "@agent please look at the signup page", eve)),
      expect((a) => a.outcome).toBe("stored"),
      emits(TriggerReceived, { superagent: s.world.superagent, trigger: s.last.trigger, thread: "C1:26.1" }),
    ),
    s.step(
      "ada switches the mode to observe, the cells as they were",
      s.ada.run(save, policy(s.world.superagent, 5n, "observe", [], cells)),
      expect((a) => a.revision).toBe(6n),
    ),
    s.step(
      "in observe, a message with no sender is stored where its cell is inferred",
      s.source.run(receive, say(s.world.superagent, "G18", "27.1", "message", "a build finished a third time")),
      expect((a) => a.outcome).toBe("stored"),
      emits(TriggerReceived, { superagent: s.world.superagent, trigger: s.last.trigger, thread: "C1:27.1" }),
    ),
    s.step(
      "ada clears the row's cells again",
      s.ada.run(save, policy(s.world.superagent, 6n, "observe", [], {})),
      expect((a) => a.revision).toBe(7n),
    ),
    s.step(
      "ada stops letting the person ask",
      s.ada.run(unlist, { account: s.world.account }),
      emits(AccountUnlisted, { account: s.world.account }),
    ),
    s.step(
      "the person whose listing was taken back is filtered like a stranger, even when they mention the agent",
      s.source.run(receive, say(s.world.superagent, "G19", "28.1", "mention", "@agent one more thing", ann)),
      expect((a) => a.outcome).toBe("filtered"),
      noEvents(),
    ),
  ],
});
