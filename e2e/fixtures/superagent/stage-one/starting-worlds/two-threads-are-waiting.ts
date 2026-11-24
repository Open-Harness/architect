// Checks-author file (Goal 17, slice 6). A builder never edits it.
// From a listed sender: U1 has mentioned the agent twice in Slack thread C1:5.1 and once in thread C1:6.1, and nothing has
// evaluated them yet: two threads wait, one with two triggers.
import { Blueprint } from "orthograph";
import receive from "@orthograph/intake/blueprint/things/trigger/verbs/receive.ts";

const mention = (superagent: unknown, event: string, ts: string, text: string) => ({
  superagent, source: "slack", event, thread: `C1:${ts}`, kind: "mention", text, actor: { id: "U1", name: "ann", bot: false }, addressed: "mention", channel: { channel: "C1", ts },
});

export default Blueprint.startingWorld("two-threads-are-waiting", {
  from: "a-sender-is-listed",
  cast: { source: Blueprint.system },
  makes: (s) => [
    s.source.run(receive, mention(s.world.superagent, "EvA1", "5.1", "@agent add a test for the slug parser")),
    s.source.run(receive, mention(s.world.superagent, "EvA2", "5.1", "@agent and document it")),
    s.source.run(receive, mention(s.world.superagent, "EvB1", "6.1", "@agent bump the lockfile")),
  ],
  gives: () => ({}),
});
