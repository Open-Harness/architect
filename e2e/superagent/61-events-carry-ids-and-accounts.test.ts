// Check 61 (Goal 17 slice 10): what an adapter says of each event it offers, by hand, beyond its schema (K40 fixes 1 and 5):
// `id(e)`, the identity of one change to what the event is about (the same from a door and from a poll, so a webhook and a
// catch-up of one comment settle once), and `actor(e)`, the outside account that sent it (its stable id, never a login, a
// name, and whether it is a bot), which the door puts on its caller. Both are pure functions of the payload the schema decodes,
// so they are judged here directly; 63 judges what the door does with them. The identities are GOAL17-connections' (A to D):
// GitHub's is the object's kind, the repository, the object's own id or number and its own last-change time, with no action and
// no delivery in it; Slack's is channel and `ts`; PostHog's is issue, kind and timestamp. PostHog's two alert events, written
// by hand like Slack's (GOAL17-names call 6), are judged whole against the shape the README fixes. Red until slice 11 widens
// `Blueprint.incoming` with `{ id, actor }` and writes PostHog's events.
import { Schema } from "effect";
import { describe, expect, it } from "vitest";
import {
  A_BOT, CHECK_ON_PR, COMMENT_CREATED, COMMENT_EDITED, ISSUE_OPENED, PR_CLOSED, POSTHOG_ALERT, POSTHOG_RESOLVED, REVIEW_COMMENT_CREATED, REVIEW_SUBMITTED, setAt, type Obj,
} from "./connections.ts";
import { appPlugin } from "./needs.ts";
import { build, descriptor, type Node } from "./plugin.ts";
import { APP_MENTION, BOT_MESSAGE, THREAD_REPLY, USER_MESSAGE } from "./slack-events.ts";

const fn = (event: Node | undefined, key: "id" | "actor", label: string) => {
  expect(typeof event?.[key], `${label} has no \`${key}\`: slice 11 widens Blueprint.incoming with { id, actor } (K40 fixes 1 and 5)`).toBe("function");
  return event![key] as (e: unknown) => any;
};
const decodes = (event: Node, payload: unknown) => { try { Schema.decodeUnknownSync(event["schema"])(payload); return true; } catch { return false; } };
/** A poll's copy of an object: what a list answers, the same fields as the webhook's object and no `action`, no `sender`, no installation. */
const polled = (payload: Obj): Obj => { const c = JSON.parse(JSON.stringify(payload)) as Obj; delete c["action"]; delete c["sender"]; delete c["installation"]; return c; };

// each GitHub event the app listens to: its payload, the path to the object's own id (or number), and to its own last-change time
const NAMED: ReadonlyArray<readonly [string, Obj, string, string]> = [
  ["issueComment", COMMENT_CREATED, "comment.id", "comment.updated_at"],
  ["pullRequestReview", REVIEW_SUBMITTED, "review.id", "review.submitted_at"],
  ["pullRequestReviewComment", REVIEW_COMMENT_CREATED, "comment.id", "comment.updated_at"],
  ["issues", ISSUE_OPENED, "issue.number", "issue.updated_at"],
  ["pullRequest", PR_CLOSED, "pull_request.number", "pull_request.updated_at"],
  ["checkRun", CHECK_ON_PR, "check_run.id", "check_run.completed_at"],
];

describe("61 github: each event names its identity and its account", () => {
  const events = async () => { build(appPlugin("github")); return (await descriptor(appPlugin("github")))["events"] as Node; };

  it.each(NAMED)("%s: its id is a non-empty string, the same each time, and nothing a delivery adds is in it: not the action, the sender, the installation", async (name, payload) => {
    const id = fn((await events())[name], "id", `github.events.${name}`);
    const one = id(payload);
    expect(typeof one).toBe("string");
    expect(one.length).toBeGreaterThan(0);
    expect(id(JSON.parse(JSON.stringify(payload)))).toBe(one);
    expect(id({ ...payload, installation: { id: 77 }, organization: { login: "acme" } })).toBe(one);
    expect(id(setAt(payload, "sender.id", 1)), "not who sent it").toBe(one);
    expect(id(setAt(payload, "action", "labeled")), "no action in it: the same object at the same time is one event").toBe(one);
    expect(id(polled(payload)), "a poll's copy, which has no action and no sender, gives the door's id").toBe(one);
  });

  it.each(NAMED)("%s: another object, another repository or another last-change time is another event", async (name, payload, objectPath, versionPath) => {
    const id = fn((await events())[name], "id", `github.events.${name}`);
    const one = id(payload);
    const objectId = payload[objectPath.split(".")[0]!] as Obj;
    const current = objectId[objectPath.split(".")[1]!] as number;
    expect(id(setAt(payload, objectPath, current + 1)), "another object").not.toBe(one);
    expect(id(setAt(payload, "repository.full_name", "acme/other")), "the same number in another repository").not.toBe(one);
    expect(id(setAt(payload, versionPath, "2027-01-01T00:00:00Z")), "the same object, changed later").not.toBe(one);
    expect(id(setAt(payload, versionPath, "2027-01-02T00:00:00Z")), "and changed again").not.toBe(id(setAt(payload, versionPath, "2027-01-01T00:00:00Z")));
  });

  it("an issue closed, reopened and closed again is three events, and the first seen again is the first", async () => {
    const id = fn((await events())["issues"], "id", "github.events.issues");
    const at = (t: string, action: string) => setAt(setAt(ISSUE_OPENED, "issue.updated_at", t), "action", action);
    const closed = id(at("2026-11-23T10:00:00Z", "closed"));
    const reopened = id(at("2026-11-23T11:00:00Z", "reopened"));
    const closedAgain = id(at("2026-11-23T12:00:00Z", "closed"));
    expect(new Set([closed, reopened, closedAgain]).size).toBe(3);
    expect(id(at("2026-11-23T10:00:00Z", "closed"))).toBe(closed);
  });

  it("a comment edited twice is two events beside the first; the edit's id is not the creation's", async () => {
    const id = fn((await events())["issueComment"], "id", "github.events.issueComment");
    const ids = [id(COMMENT_CREATED), id(COMMENT_EDITED), id(setAt(COMMENT_EDITED, "comment.updated_at", "2026-11-23T09:02:00Z"))];
    expect(new Set(ids).size).toBe(3);
    expect(id(setAt(COMMENT_CREATED, "issue.number", 99)), "the comment's id names it; the issue is not part of it").toBe(ids[0]);
  });

  it("the same repository, number and last-change time from four kinds of object are four ids: only the kind tells a comment, a review comment, a review and a check run apart", async () => {
    const all = await events();
    const T = "2026-11-23T11:00:00Z";
    const same = (payload: Obj, path: string, version: string) => setAt(setAt(setAt(payload, path, 9001), version, T), "repository.full_name", "acme/widgets");
    const ids = [
      fn(all["issueComment"], "id", "issueComment")(same(COMMENT_CREATED, "comment.id", "comment.updated_at")),
      fn(all["pullRequestReviewComment"], "id", "pullRequestReviewComment")(same(REVIEW_COMMENT_CREATED, "comment.id", "comment.updated_at")),
      fn(all["pullRequestReview"], "id", "pullRequestReview")(same(REVIEW_SUBMITTED, "review.id", "review.submitted_at")),
      fn(all["checkRun"], "id", "checkRun")(setAt(same(CHECK_ON_PR, "check_run.id", "check_run.completed_at"), "check_run.started_at", T)),
    ];
    expect(new Set(ids).size, ids.join(" | ")).toBe(4);
  });

  it.each(NAMED)("%s: the account is the sender: the stable numeric id as a string, the login as its name, and whether it is a bot", async (name, payload) => {
    const actor = fn((await events())[name], "actor", `github.events.${name}`);
    const sender = payload["sender"] as Obj;
    expect(actor(payload)).toEqual({ id: String(sender["id"]), name: sender["login"], bot: sender["type"] === "Bot" });
  });

  it("a person is not a bot and a bot is, on a closed pull request and a comment alike; a change of login keeps the id; only the type Bot is a bot", async () => {
    const all = await events();
    for (const name of ["issueComment", "pullRequest"]) {
      const actor = fn(all[name], "actor", `github.events.${name}`);
      const payload = name === "issueComment" ? COMMENT_CREATED : PR_CLOSED;
      expect(actor(payload)).toEqual({ id: "583231", name: "octocat", bot: false });
      expect(actor(setAt(payload, "sender", A_BOT))).toEqual({ id: "41898282", name: "github-actions[bot]", bot: true });
      expect(actor(setAt(payload, "sender.login", "renamed"))).toEqual({ id: "583231", name: "renamed", bot: false });
      expect(actor(setAt(payload, "sender.type", "Organization")).bot).toBe(false);
    }
  });
});

describe("61 slack: each event names its identity and its account", () => {
  const events = async () => { build(appPlugin("slack")); return (await descriptor(appPlugin("slack")))["events"] as Node; };
  const message = (over: Obj = {}) => ({ ...USER_MESSAGE, ...over }) as Obj;

  it("an app mention's and a message's account is the Slack user, by id, and a person is not a bot", async () => {
    const all = await events();
    expect(fn(all["appMention"], "actor", "slack.events.appMention")(APP_MENTION)).toMatchObject({ id: "U061F7AUR", bot: false });
    const actor = fn(all["message"], "actor", "slack.events.message");
    expect(actor(USER_MESSAGE)).toMatchObject({ id: "U024BE7LH", bot: false });
    expect(actor(THREAD_REPLY)).toMatchObject({ id: "U024BE7LH", bot: false });
    expect(actor(setAt(USER_MESSAGE, "event.user", "U0OTHER000"))).toMatchObject({ id: "U0OTHER000" });
  });

  it("a bot's message has no user, so its account is its bot id, and it is a bot", async () => {
    expect(fn((await events())["message"], "actor", "slack.events.message")(BOT_MESSAGE)).toMatchObject({ id: "B19LU7CSY", bot: true });
  });

  it("one message is one event: its id is its channel and time, whatever the envelope's event id, the event's kind, or a retry; a reply, another channel or another time is another", async () => {
    const all = await events();
    const id = fn(all["message"], "id", "slack.events.message");
    const one = id(USER_MESSAGE);
    expect(typeof one).toBe("string");
    expect(id(JSON.parse(JSON.stringify(USER_MESSAGE)))).toBe(one);
    expect(id(setAt(USER_MESSAGE, "event_id", "Ev0RETRY001")), "Slack's retry may carry a new event id").toBe(one);
    expect(id(setAt(USER_MESSAGE, "event_time", 1)), "nor is the envelope's time in it").toBe(one);
    expect(id(THREAD_REPLY)).not.toBe(one);
    expect(id(setAt(USER_MESSAGE, "event.channel", "C0OTHER000"))).not.toBe(one);
    expect(id(setAt(USER_MESSAGE, "event.ts", "1355517523.000006"))).not.toBe(one);
    expect(id(BOT_MESSAGE)).not.toBe(one);
    // the same message arrives as a message and as an app mention, each with its own event id: one event
    const mention = fn(all["appMention"], "id", "slack.events.appMention");
    expect(mention(APP_MENTION), "an app mention is the same sort of event").not.toBe(id(USER_MESSAGE));
    expect(mention(APP_MENTION)).toBe(id(message({ event: { ...(USER_MESSAGE["event"] as Obj), channel: "C0LAN2Q65", ts: "1515449522.000016" } })));
    expect(mention(setAt(APP_MENTION, "event.ts", "1515449522.000017"))).not.toBe(mention(APP_MENTION));
    expect(mention(setAt(APP_MENTION, "event.channel", "C0OTHER000"))).not.toBe(mention(APP_MENTION));
  });
});

describe("61 posthog: the alert events, written by hand", () => {
  const events = async () => { build(appPlugin("posthog")); return (await descriptor(appPlugin("posthog")))["events"] as Node; };
  const roundtrip = (event: Node, payload: unknown) => JSON.parse(JSON.stringify(Schema.decodeUnknownSync(event["schema"])(payload))) as unknown;

  it("the adapter offers exactly errorAlert and errorResolved, and each decodes its own payload whole, what a template adds kept, at every level", async () => {
    const all = await events();
    expect(Object.keys(all ?? {}).sort()).toEqual(["errorAlert", "errorResolved"]);
    expect(roundtrip(all["errorAlert"], POSTHOG_ALERT)).toEqual(POSTHOG_ALERT);
    expect(roundtrip(all["errorResolved"], POSTHOG_RESOLVED)).toEqual(POSTHOG_RESOLVED);
    for (const [event, base] of [["errorAlert", POSTHOG_ALERT], ["errorResolved", POSTHOG_RESOLVED]] as const) {
      const extra = setAt(setAt(setAt(base, "source", { name: "PostHog" }), "issue.first_seen", "2026-11-20T00:00:00Z"), "project.name", "web");
      expect(roundtrip(all[event], extra), `${event}: extras at the top, in the issue and in the project are kept`).toEqual(extra);
    }
  });

  it("a description is optional and may be null; each wrong payload is refused: a part left out, a part of another type, the other event's payload", async () => {
    const all = await events();
    const alert = all["errorAlert"] as Node;
    expect(alert?.["schema"], "posthog.events.errorAlert").toBeDefined();
    expect(roundtrip(alert, setAt(POSTHOG_ALERT, "issue.description", null))).toEqual(setAt(POSTHOG_ALERT, "issue.description", null));
    expect(decodes(alert, setAt(POSTHOG_ALERT, "issue.description", undefined))).toBe(true);
    for (const path of ["project", "project.id", "issue", "issue.id", "issue.name", "issue.url", "issue.status", "timestamp"]) expect(decodes(alert, setAt(POSTHOG_ALERT, path, undefined)), `${path} left out`).toBe(false);
    for (const [path, value] of [["project.id", 1], ["project", "1"], ["issue.id", 7], ["issue.name", null], ["issue.url", 5], ["issue", []], ["issue.description", 5], ["timestamp", 1700000000], ["timestamp", null]] as const) {
      expect(decodes(alert, setAt(POSTHOG_ALERT, path, value as never)), `${path} = ${JSON.stringify(value)}`).toBe(false);
    }
    expect(decodes(alert, POSTHOG_RESOLVED), "a resolved issue is not an alert").toBe(false);
    expect(decodes(all["errorResolved"], POSTHOG_ALERT), "an alert is not a resolve").toBe(false);
    for (const path of ["project.id", "issue.id", "issue.status", "timestamp"]) expect(decodes(all["errorResolved"], setAt(POSTHOG_RESOLVED, path, undefined)), `resolved: ${path} left out`).toBe(false);
    for (const wrong of [null, "alert", [], {}, 7]) expect(decodes(alert, wrong), JSON.stringify(wrong)).toBe(false);
  });

  it("an alert names no account (the gate's unnamed sender); its identity is its issue, its kind and its time: a reopen is a new event, a resolve or another issue is another", async () => {
    const all = await events();
    expect(fn(all["errorAlert"], "actor", "posthog.events.errorAlert")(POSTHOG_ALERT), "no account: PostHog has no sender").toBeUndefined();
    expect(fn(all["errorResolved"], "actor", "posthog.events.errorResolved")(POSTHOG_RESOLVED)).toBeUndefined();
    const alertId = fn(all["errorAlert"], "id", "posthog.events.errorAlert");
    const resolvedId = fn(all["errorResolved"], "id", "posthog.events.errorResolved");
    const one = alertId(POSTHOG_ALERT);
    expect(typeof one).toBe("string");
    expect(alertId(JSON.parse(JSON.stringify(POSTHOG_ALERT)))).toBe(one);
    expect(alertId(setAt(POSTHOG_ALERT, "issue.name", "Renamed")), "what the issue is called is not in it").toBe(one);
    expect(alertId(setAt(POSTHOG_ALERT, "issue.id", "0190f5d8-0000-7000-8000-000000000002"))).not.toBe(one);
    expect(alertId(setAt(POSTHOG_ALERT, "timestamp", "2026-11-24T09:00:00Z")), "alerted again later: a reopened issue").not.toBe(one);
    expect(resolvedId(POSTHOG_RESOLVED)).not.toBe(one);
    expect(resolvedId(setAt(POSTHOG_RESOLVED, "timestamp", POSTHOG_ALERT["timestamp"] as string)), "resolved at the very instant it was alerted").not.toBe(one);
  });
});
