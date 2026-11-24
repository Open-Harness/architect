// The values every slice 8 journey agrees on. Each is chosen here, once, because no record fixes it; a record that does says where.
/** The GitHub account the superagents list (the brief's `allowed: ["github:583231", ...]`): its mount and its outside id (GOAL17-account-key). */
export const ANN = { source: "github", external: "583231", login: "ann" } as const;
/** A stranger, who is never listed (GOAL17-check-harness call 5's `github:999`). */
export const EVE = { source: "github", external: "999", login: "eve" } as const;
export const REPO = "acme/widgets";
/** Slack's stand-in world (e2e/superagent/README.md, point 7): channel and bot. A Slack thread is `<channel>:<ts>` (GOAL17-source-from). */
export const CHANNEL = "C024BE91L";
export const SLACK_TS = "1700000000.000100";
export const SLACK_THREAD = `${CHANNEL}:${SLACK_TS}`;
export const SLACK_THREAD_TWO = `${CHANNEL}:1700000000.000200`;
export const PLAYBOOK = { sandbox: "local", endsWhen: "threadsClosed" } as const;
/** The connections a superagent of these journeys has: the stand-ins' own repository and channel, as the brief writes a connection. */
export const CONNECTIONS = [
  { source: "github", config: { repo: REPO, me: { id: "1", login: "agent" }, events: ["issues", "comments", "reviews", "checks"] } },
  { source: "slack", config: { channels: [CHANNEL], me: { id: "U0BOT0001", login: "agent" }, directMessages: false } },
] as const;
/** The pool the seat journeys use: one seat and the reserve, so one running turn makes the pool full. */
export const POOL = 1n;
