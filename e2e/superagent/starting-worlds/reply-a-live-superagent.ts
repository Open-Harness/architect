import { Blueprint } from "orthograph";
import superagentCreate from "@orthograph/superagent/blueprint/things/superagent/verbs/create.ts";
import superagentGoLive from "@orthograph/superagent/blueprint/things/superagent/verbs/go-live.ts";

/** One superagent, `coder`, listening to acme/widgets on GitHub and #eng on Slack, made and gone live by ann. One seat in its pool and the reserve. */
export default Blueprint.startingWorld("reply-a-live-superagent", {
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
    s.ann.run(superagentGoLive, { superagent: s.last.superagent }),
  ],
  gives: (s) => ({ main: s.world.main, superagent: s.last.superagent }),
});
