// What checks 60 to 65 (Goal 17 slice 10) share: the payloads each service sends, the way each signs, and the connection
// configurations. Every expected value is a literal written here, from what the services document, never read back from the
// code under test. GitHub's payloads are the spec's own samples (full) with the fields a check cares about set to literals,
// and 60 shows each still fits its spec; Slack's are `slack-events.ts`; PostHog's are written once below (README, point 3).
import { createHmac } from "node:crypto";
import { trimmed } from "./pins.ts";
import { sample } from "./schema.ts";
import { readSpec, webhooks, type Json } from "./spec.ts";

export type Obj = { [key: string]: Json };

// ---- signing, as each service documents it ----

/** GitHub: `X-Hub-Signature-256` is `sha256=` and the hex HMAC-SHA256 of the raw body under the webhook's secret. */
export const githubSignature = (secret: string, raw: string) => `sha256=${createHmac("sha256", secret).update(raw).digest("hex")}`;
/** GitHub's legacy `X-Hub-Signature`: `sha1=` and the hex HMAC-SHA1 of the raw body. The door must not accept it alone. */
export const githubLegacySignature = (secret: string, raw: string) => `sha1=${createHmac("sha1", secret).update(raw).digest("hex")}`;
/** Slack's own worked example (docs.slack.dev, "Verifying requests from Slack"): this secret, time and body sign to this value. */
export const SLACK_DOCUMENTED = {
  secret: "8f742231b10e8888abcd99yyyzzz85a5", timestamp: 1531420618,
  body: "token=xyzz0WbapA4vBCDEFasx0q6G&team_id=T1DC2JH3J&team_domain=testteamnow&channel_id=G8PSS9T3V&channel_name=foobar&user_id=U2CERLKJA&user_name=roadrunner&command=%2Fwebhook-collect&text=&response_url=https%3A%2F%2Fhooks.slack.com%2Fcommands%2FT1DC2JH3J%2F397700885554%2F96rGlfmibIGlgcZRskXaIFfN&trigger_id=398738663015.47445629121.803a0bc887a14d10d2c447fce8b6703c",
  signature: "v0=a2114d57b48eac39b9ad189dd8316235a7b4a8d21a10bd27519666489c69b503",
} as const;
/** Slack: `X-Slack-Signature` is `v0=` and the hex HMAC-SHA256 of `v0:<X-Slack-Request-Timestamp>:<raw body>`; a timestamp over five minutes off is refused. */
export const slackSignature = (secret: string, timestamp: number, raw: string) => `v0=${createHmac("sha256", secret).update(`v0:${timestamp}:${raw}`).digest("hex")}`;

// ---- GitHub's payloads ----

const spec = () => readSpec(trimmed("github"));
const merge = (base: Json, over: Json): Json => {
  if (Array.isArray(over)) return over.map((o, i) => merge((Array.isArray(base) ? (base[i] ?? base[0]) : undefined) ?? null, o as Json));
  if (typeof over === "object" && over !== null) {
    const b = typeof base === "object" && base !== null && !Array.isArray(base) ? (base as Obj) : {};
    return { ...b, ...Object.fromEntries(Object.entries(over).map(([k, v]) => [k, merge(b[k] ?? null, v as Json)])) };
  }
  return over;
};

/** The spec's full sample of one entry (`issue-comment-created`) with `over` laid over it. */
export const githubPayload = (entry: string, over: Obj): Obj => {
  const found = webhooks(spec()).flatMap((e) => e.actions).find((a) => a.entry === entry);
  if (found === undefined) throw new Error(`the pinned GitHub spec has no webhook ${entry}`);
  return merge(sample(spec(), found.schema, { full: true }), over) as Obj;
};
export const githubSchemaOf = (entry: string) => webhooks(spec()).flatMap((e) => e.actions).find((a) => a.entry === entry)!.schema;
export const githubSpec = spec;

export const REPO = "acme/widgets";
export const OCTOCAT: Obj = { id: 583231, login: "octocat", type: "User" };
export const A_BOT: Obj = { id: 41898282, login: "github-actions[bot]", type: "Bot" };
const repository: Obj = { full_name: REPO };

/** Ann's comment on issue 12, which asks the agent (login `agent`) for something. */
export const COMMENT_CREATED = githubPayload("issue-comment-created", {
  action: "created", sender: OCTOCAT, repository, issue: { number: 12 },
  comment: { id: 9001, body: "@agent fix the flaky login test", html_url: "https://github.com/acme/widgets/issues/12#issuecomment-9001", created_at: "2026-11-23T09:00:00Z", updated_at: "2026-11-23T09:00:00Z" },
});
/** The same comment, edited a minute later. */
export const COMMENT_EDITED = githubPayload("issue-comment-edited", {
  action: "edited", sender: OCTOCAT, repository, issue: { number: 12 }, changes: { body: { from: "@agent fix the flaky login test" } },
  comment: { id: 9001, body: "@agent fix the flaky login test, please", html_url: "https://github.com/acme/widgets/issues/12#issuecomment-9001", created_at: "2026-11-23T09:00:00Z", updated_at: "2026-11-23T09:01:00Z" },
});
export const REVIEW_SUBMITTED = githubPayload("pull-request-review-submitted", {
  action: "submitted", sender: OCTOCAT, repository, pull_request: { number: 14 },
  review: { id: 7001, body: "This needs a test.", html_url: "https://github.com/acme/widgets/pull/14#pullrequestreview-7001", submitted_at: "2026-11-23T11:00:00Z" },
});
export const REVIEW_COMMENT_CREATED = githubPayload("pull-request-review-comment-created", {
  action: "created", sender: OCTOCAT, repository, pull_request: { number: 14 },
  comment: { id: 9001, body: "Rename this.", html_url: "https://github.com/acme/widgets/pull/14#discussion_r9001", updated_at: "2026-11-23T11:05:00Z" },
});
export const ISSUE_OPENED = githubPayload("issues-opened", {
  action: "opened", sender: OCTOCAT, repository,
  issue: { number: 15, title: "Slug parser drops dashes", body: "@agent can you look?", html_url: "https://github.com/acme/widgets/issues/15", updated_at: "2026-11-23T10:00:00Z" },
});
export const PR_CLOSED = githubPayload("pull-request-closed", { action: "closed", sender: OCTOCAT, repository, pull_request: { number: 14, merged: true, updated_at: "2026-11-23T12:00:00Z" } });
export const CHECK_ON_PR = githubPayload("check-run-completed", {
  action: "completed", sender: A_BOT, repository,
  check_run: { id: 5001, name: "ci", conclusion: "failure", html_url: "https://github.com/acme/widgets/runs/5001", pull_requests: [{ number: 14 }], started_at: "2026-11-23T12:10:00Z", completed_at: "2026-11-23T12:15:00Z" },
});
export const CHECK_ON_NO_PR = githubPayload("check-run-completed", {
  action: "completed", sender: A_BOT, repository,
  check_run: { id: 5002, name: "ci", conclusion: "success", html_url: "https://github.com/acme/widgets/runs/5002", pull_requests: [], started_at: "2026-11-23T12:10:00Z", completed_at: "2026-11-23T12:15:00Z" },
});

// ---- PostHog's payload ----
// PostHog publishes no body for an alert: a destination's template makes it (README, point 3). This is the shape the design's
// mapping reads (GOAL17-source-from, "One GitHub, one Slack and one PostHog source"), written here once.
export const ISSUE_ID = "0190f5d8-0000-7000-8000-000000000001";
export const POSTHOG_ALERT: Obj = {
  timestamp: "2026-11-23T09:00:00Z",
  project: { id: "1" },
  issue: { id: ISSUE_ID, name: "TypeError", description: "Cannot read properties of undefined (reading 'slug')", url: `https://us.posthog.com/project/1/error_tracking/${ISSUE_ID}`, status: "active" },
};
export const POSTHOG_RESOLVED: Obj = { timestamp: "2026-11-23T10:00:00Z", project: { id: "1" }, issue: { ...(POSTHOG_ALERT["issue"] as Obj), status: "resolved" } };

// ---- configurations ----
export const GITHUB_CONFIG = { repo: REPO, me: { id: "9001", login: "agent" }, events: ["issues", "comments", "reviews", "checks"] };
export const SLACK_CONFIG = { me: { id: "U0LAN0Z89", login: "agent" }, channels: ["C024BE91L"], directMessages: true };
export const POSTHOG_CONFIG = { me: { id: "posthog", login: "posthog" }, project: "1", kinds: ["errorIssue"] };
/** The Slack user id the app's bot has: a mention of it in a message's text is `<@U0LAN0Z89>`. */
export const SLACK_ME_MENTION = "<@U0LAN0Z89>";

export const clone = <A extends Json>(v: A): A => JSON.parse(JSON.stringify(v)) as A;
/** `base` with the value at a dotted path set (or removed, with `undefined`). */
export const setAt = (base: Obj, path: string, value: Json | undefined): Obj => {
  const copy = clone(base);
  const keys = path.split(".");
  let at: Obj = copy;
  for (const k of keys.slice(0, -1)) at = at[k] as Obj;
  if (value === undefined) delete at[keys[keys.length - 1]!]; else at[keys[keys.length - 1]!] = value;
  return copy;
};
