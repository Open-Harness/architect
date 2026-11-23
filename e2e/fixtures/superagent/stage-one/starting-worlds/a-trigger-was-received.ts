// Checks-author file (Goal 17, slice 6). A builder never edits it.
// From a listed sender: U1 has mentioned the agent in Slack thread C1:1.1, and the source's caller has stored it.
import { Blueprint } from "orthograph";
import receive from "@orthograph/intake/blueprint/things/trigger/verbs/receive.ts";

export default Blueprint.startingWorld("a-trigger-was-received", {
  from: "a-sender-is-listed",
  cast: { source: Blueprint.system },
  makes: (s) => [
    s.source.run(receive, {
      superagent: s.world.superagent, source: "slack", event: "Ev1", thread: "C1:1.1", kind: "mention",
      text: "@agent fix the flaky login test", author: "U1", channel: { channel: "C1", ts: "1.1" },
    }),
  ],
  gives: (s) => ({ trigger: s.last.trigger }),
});
