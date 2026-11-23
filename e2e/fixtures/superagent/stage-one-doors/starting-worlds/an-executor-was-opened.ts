// Checks-author file (Goal 17, slice 6). A builder never edits it.
// From a listed sender: an executor Agent has been opened for a ticket that does not exist yet, in the Agent's own store, by the system.
import { Blueprint } from "orthograph";
import open from "@orthograph/agents/blueprint/things/agent/verbs/open.ts";

export default Blueprint.startingWorld("an-executor-was-opened", {
  from: "a-sender-is-listed",
  cast: { host: Blueprint.system },
  makes: (s) => [s.host.run(open, { kind: "executor", about: "ticket/new" })],
  gives: (s) => ({ executor: s.last.agent }),
});
