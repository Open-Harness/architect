import { Blueprint } from "orthograph";
import superagentCreate from "@orthograph/superagent/blueprint/things/superagent/verbs/create.ts";

/** One superagent, `coder`, listening to acme/widgets on GitHub and #eng on Slack, made by ann and not yet live. One seat in its pool and the reserve. */
export default Blueprint.startingWorld("reply-an-observing-superagent", {
  from: "reply-a-main-agent-exists",
  cast: { ann: Blueprint.signedIn },
  makes: (s) => [
    s.ann.run(superagentCreate, {
      name: "coder", purpose: "Takes asks on issues and in Slack.", slots: 1n, main: s.world.main, playbook: { sandbox: "local", endsWhen: "threadsClosed" },
      connections: [
        { source: "github", config: { repo: "acme/widgets", me: { id: "1", login: "agent" }, events: ["issues", "comments", "reviews", "checks"] } },
        { source: "slack", config: { channels: ["C024BE91L"], me: { id: "U0BOT0001", login: "agent" }, directMessages: false } },
      ],
    }),
  ],
  gives: (s) => ({ main: s.world.main, superagent: s.last.superagent }),
});
