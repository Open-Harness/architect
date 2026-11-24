// Checks-author file (Goal 17, slice 6). A builder never edits it (AGENTS.md, "Journeys and checks come first").
// A superagent a person made, with its main agent: the world every journey that needs one starts from.
//
// `superagent.create` takes `main`, a reference to an Agent that already exists (the framework refuses an unknown one with
// `AgentNotFound` before any handler runs), so the world opens the agent first, as the system, and passes it. See
// `e2e/superagent/README.md`, "Slice 6", point 3.
import { Blueprint } from "orthograph";
import open from "@orthograph/agents/blueprint/things/agent/verbs/open.ts";
import create from "@orthograph/superagent/blueprint/things/superagent/verbs/create.ts";

export default Blueprint.startingWorld("an-observing-superagent", {
  cast: { ada: Blueprint.signedIn, host: Blueprint.system },
  makes: (s) => [
    s.host.run(open, { kind: "main", about: "superagent/stage-one" }),
    s.ada.run(create, {
      name: "stage one",
      purpose: "Takes asks in Slack channel C1.",
      connections: [{ source: "slack", config: { me: { id: "UBOT", login: "agent" }, channels: ["C1"], directMessages: false } }],
      playbook: { sandbox: "local", endsWhen: "threadsClosed" },
      slots: 2n,
      main: s.last.agent,
    }),
  ],
  gives: (s) => ({ superagent: s.last.superagent }),
});
