import { Superagent } from "@orthograph/superagent";
import { githubSource } from "@orthograph/intake/blueprint/sources/github.ts";
import { slackSource } from "@orthograph/intake/blueprint/sources/slack.ts";

// The coding agent: it exists from the first deploy. The triage agent is made at runtime, with the same shape, by `superagent.create`.
export default Superagent.declare({
  name: "coder",
  purpose: "Takes asks on issues and in Slack; answers with pull requests.",
  connections: [
    githubSource({ repo: "acme/widgets", me: { id: "<bot id>", login: "<bot login>" }, events: ["issues", "comments", "reviews", "checks"] }),
    slackSource({ channels: ["#eng"], me: { id: "<bot id>", login: "<bot login>" }, directMessages: true }),
  ],
  policy: { mode: "observe", allowed: ["github:583231", "slack:U024BE7LH"], admission: { "#eng": "explicit" } },
  playbook: { sandbox: "local", prepare: "pnpm install", endsWhen: "threadsClosed" },
});
