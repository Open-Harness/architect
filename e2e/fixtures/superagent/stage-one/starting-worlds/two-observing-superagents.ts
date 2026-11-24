// Checks-author file (Goal 17, slice 6; GOAL17-dead-role-paths). A builder never edits it.
// From an observing superagent: a second one, made the same way, for journeys that need "another superagent" that exists.
import { Blueprint } from "orthograph";
import open from "@orthograph/agents/blueprint/things/agent/verbs/open.ts";
import create from "@orthograph/superagent/blueprint/things/superagent/verbs/create.ts";

export default Blueprint.startingWorld("two-observing-superagents", {
  from: "an-observing-superagent",
  cast: { ada: Blueprint.signedIn, host: Blueprint.system },
  makes: (s) => [
    s.host.run(open, { kind: "main", about: "superagent/stage-one-other" }),
    s.ada.run(create, {
      name: "the other one",
      purpose: "Takes asks in Slack channel C2.",
      connections: [{ source: "slack", config: { me: { id: "UBOT2", login: "other-agent" }, channels: ["C2"], directMessages: false } }],
      playbook: { sandbox: "local", endsWhen: "threadsClosed" },
      slots: 2n,
      main: s.last.agent,
    }),
  ],
  gives: (s) => ({ other: s.last.superagent }),
});
