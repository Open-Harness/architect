// Check 61 (Goal 17 slice 10): what an adapter says of each event it offers, by hand, beyond its schema (K40 fixes 1 and 5):
// `id(e)`, the identity of one change to what the event is about (the same from a door and from a poll, so a webhook and a
// catch-up of one comment settle once), and `actor(e)`, the outside account that sent it (its stable id, never a login, a
// name, and whether it is a bot), which the door puts on its caller. Both are pure functions of the payload the schema decodes,
// so they are judged here directly; 63 judges what the door does with them. PostHog's two alert events, written by hand like
// Slack's (GOAL17-names call 6), are judged whole against the shape the README fixes. Red until slice 11 widens
// `Blueprint.incoming` with `{ id, actor }` and writes PostHog's events.
import { Schema } from "effect";
import { describe, expect, it } from "vitest";
import {
  CHECK_ON_PR, COMMENT_CREATED, COMMENT_EDITED, ISSUE_OPENED, PR_CLOSED, POSTHOG_ALERT, POSTHOG_RESOLVED, REVIEW_COMMENT_CREATED, REVIEW_SUBMITTED, A_BOT, setAt, type Obj,
} from "./connections.ts";
import { appPlugin } from "./needs.ts";
import { build, descriptor, type Node } from "./plugin.ts";
import { APP_MENTION, BOT_MESSAGE, THREAD_REPLY, USER_MESSAGE } from "./slack-events.ts";

const fn = (event: Node | undefined, key: "id" | "actor", label: string) => {
  expect(typeof event?.[key], `${label} has no \`${key}\`: slice 11 widens Blueprint.incoming with { id, actor } (K40 fixes 1 and 5)`).toBe("function");
  return event![key] as (e: unknown) => any;
};
const decodes = (event: Node, payload: unknown) => { try { Schema.decodeUnknownSync(event["schema"])(payload); return true; } catch { return false; } };

describe("61 github: each event names its identity and its account", () => {
  const events = async () => { build(appPlugin("github")); return (await descriptor(appPlugin("github")))["events"] as Node; };
  const NAMED: ReadonlyArray<readonly [string, Obj]> = [
    ["issueComment", COMMENT_CREATED], ["pullRequestReview", REVIEW_SUBMITTED], ["pullRequestReviewComment", REVIEW_COMMENT_CREATED],
    ["issues", ISSUE_OPENED], ["pullRequest", PR_CLOSED], ["checkRun", CHECK_ON_PR],
  ];

  it.each(NAMED)("%s: its id is a non-empty string, the same each time and whatever else the sender adds around it", async (name, payload) => {
    const id = fn((await events())[name], "id", `github.events.${name}`);
    const one = id(payload);
    expect(typeof one).toBe("string");
    expect(one.length).toBeGreaterThan(0);
    expect(id(JSON.parse(JSON.stringify(payload)))).toBe(one);
    expect(id({ ...payload, installation: { id: 77 }, organization: { login: "acme" } }), "what a poll cannot know, or a delivery adds, is not in the identity").toBe(one);
    expect(id(setAt(payload, "sender.id", 1)), "nor is who sent it").toBe(one);
  });

  it("a comment's id is its object and its action: another comment, another action, and an edit later in time are each another event; a poll's copy of the comment is the same", async () => {
    const id = fn((await events())["issueComment"], "id", "github.events.issueComment");
    const created = id(COMMENT_CREATED);
    expect(id(setAt(COMMENT_CREATED, "comment.id", 9002)), "another comment").not.toBe(created);
    expect(id(COMMENT_EDITED), "the same comment, edited").not.toBe(created);
    expect(id(setAt(COMMENT_EDITED, "comment.updated_at", "2026-11-23T09:02:00Z")), "edited again: a comment edited twice is two events (K40 fix 5)").not.toBe(id(COMMENT_EDITED));
    expect(id(setAt(COMMENT_CREATED, "action", "deleted"))).not.toBe(created);
    expect(id(setAt(COMMENT_CREATED, "issue.number", 99)), "the comment's id names it; the issue is not part of it").toBe(created);
  });

  it("the same number from two kinds of object is two ids: comment 9001 and review comment 9001 are not one event", async () => {
    const all = await events();
    const comment = fn(all["issueComment"], "id", "issueComment")(COMMENT_CREATED);
    const reviewComment = fn(all["pullRequestReviewComment"], "id", "pullRequestReviewComment")(REVIEW_COMMENT_CREATED);
    expect(comment).not.toBe(reviewComment);
    const review = fn(all["pullRequestReview"], "id", "pullRequestReview")(setAt(REVIEW_SUBMITTED, "review.id", 9001));
    expect(new Set([comment, reviewComment, review]).size).toBe(3);
  });

  it("a review's, an issue's and a check's ids follow their own object and action", async () => {
    const all = await events();
    const review = fn(all["pullRequestReview"], "id", "pullRequestReview");
    expect(review(setAt(REVIEW_SUBMITTED, "review.id", 7002))).not.toBe(review(REVIEW_SUBMITTED));
    expect(review(setAt(REVIEW_SUBMITTED, "action", "dismissed"))).not.toBe(review(REVIEW_SUBMITTED));
    const issue = fn(all["issues"], "id", "issues");
    expect(issue(setAt(ISSUE_OPENED, "issue.number", 16))).not.toBe(issue(ISSUE_OPENED));
    expect(issue(setAt(ISSUE_OPENED, "action", "closed"))).not.toBe(issue(ISSUE_OPENED));
    const check = fn(all["checkRun"], "id", "checkRun");
    expect(check(setAt(CHECK_ON_PR, "check_run.id", 5003))).not.toBe(check(CHECK_ON_PR));
    expect(check(setAt(CHECK_ON_PR, "action", "created"))).not.toBe(check(CHECK_ON_PR));
    const pr = fn(all["pullRequest"], "id", "pullRequest");
    expect(pr(setAt(PR_CLOSED, "pull_request.number", 15))).not.toBe(pr(PR_CLOSED));
    expect(pr(setAt(PR_CLOSED, "action", "reopened"))).not.toBe(pr(PR_CLOSED));
  });

  it.each(NAMED.filter(([name]) => name !== "pullRequest"))("%s: the account is the sender: the stable numeric id as a string, the login as its name, and whether it is a bot", async (name, payload) => {
    const actor = fn((await events())[name], "actor", `github.events.${name}`);
    const sender = payload["sender"] as Obj;
    expect(actor(payload)).toEqual({ id: String(sender["id"]), name: sender["login"], bot: sender["type"] === "Bot" });
  });

  it("a person is not a bot and a bot is: octocat (a User) and github-actions[bot] (a Bot), and a change of login keeps the id", async () => {
    const actor = fn((await events())["issueComment"], "actor", "github.events.issueComment");
    expect(actor(COMMENT_CREATED)).toEqual({ id: "583231", name: "octocat", bot: false });
    expect(actor(setAt(COMMENT_CREATED, "sender", A_BOT))).toEqual({ id: "41898282", name: "github-actions[bot]", bot: true });
    expect(actor(setAt(COMMENT_CREATED, "sender.login", "renamed"))).toEqual({ id: "583231", name: "renamed", bot: false });
    expect(actor(setAt(COMMENT_CREATED, "sender.type", "Organization")).bot, "only the type Bot is a bot").toBe(false);
  });
});

describe("61 slack: each event names its identity and its account", () => {
  const events = async () => { build(appPlugin("slack")); return (await descriptor(appPlugin("slack")))["events"] as Node; };

  it("an app mention's and a message's account is the Slack user, by id, and a person is not a bot", async () => {
    const all = await events();
    expect(fn(all["appMention"], "actor", "slack.events.appMention")(APP_MENTION)).toMatchObject({ id: "U061F7AUR", bot: false });
    const message = fn(all["message"], "actor", "slack.events.message");
    expect(message(USER_MESSAGE)).toMatchObject({ id: "U024BE7LH", bot: false });
    expect(message(THREAD_REPLY)).toMatchObject({ id: "U024BE7LH", bot: false });
    expect(message(setAt(USER_MESSAGE, "event.user", "U0OTHER000"))).toMatchObject({ id: "U0OTHER000" });
  });

  it("a message's identity is its channel and time: a retry of one message is the same, another message or another channel is not, and a reply is its own", async () => {
    const id = fn((await events())["message"], "id", "slack.events.message");
    const one = id(USER_MESSAGE);
    expect(typeof one).toBe("string");
    expect(id(JSON.parse(JSON.stringify(USER_MESSAGE)))).toBe(one);
    expect(id(setAt(USER_MESSAGE, "event_id", "Ev0RETRY001")), "Slack's retry of one message keeps its time, not always its envelope's id").toBe(one);
    expect(id(THREAD_REPLY)).not.toBe(one);
    expect(id(setAt(USER_MESSAGE, "event.channel", "C0OTHER000"))).not.toBe(one);
    expect(id(setAt(USER_MESSAGE, "event.ts", "1355517523.000006"))).not.toBe(one);
    expect(id(BOT_MESSAGE), "a bot's message has an id too").not.toBe(one);
  });

  it("an app mention's identity is the same kind of thing: stable, and another message another id", async () => {
    const id = fn((await events())["appMention"], "id", "slack.events.appMention");
    expect(id(APP_MENTION)).toBe(id(JSON.parse(JSON.stringify(APP_MENTION))));
    expect(id(setAt(APP_MENTION, "event.ts", "1515449522.000017"))).not.toBe(id(APP_MENTION));
    expect(id(setAt(APP_MENTION, "event.channel", "C0OTHER000"))).not.toBe(id(APP_MENTION));
  });
});

describe("61 posthog: the alert events, written by hand", () => {
  const events = async () => { build(appPlugin("posthog")); return (await descriptor(appPlugin("posthog")))["events"] as Node; };
  const roundtrip = (event: Node, payload: unknown) => JSON.parse(JSON.stringify(Schema.decodeUnknownSync(event["schema"])(payload))) as unknown;

  it("the adapter offers exactly errorAlert and errorResolved, and each decodes its own payload whole", async () => {
    const all = await events();
    expect(Object.keys(all ?? {}).sort()).toEqual(["errorAlert", "errorResolved"]);
    expect(roundtrip(all["errorAlert"], POSTHOG_ALERT)).toEqual(POSTHOG_ALERT);
    expect(roundtrip(all["errorResolved"], POSTHOG_RESOLVED)).toEqual(POSTHOG_RESOLVED);
    const extra = { ...POSTHOG_ALERT, source: { name: "PostHog" } };
    expect(roundtrip(all["errorAlert"], extra), "what a template adds is kept").toEqual(extra);
    expect(roundtrip(all["errorAlert"], setAt(POSTHOG_ALERT, "issue.description", undefined)), "a description is optional").toEqual(setAt(POSTHOG_ALERT, "issue.description", undefined));
  });

  it("each wrong payload is refused: a part left out, a part of another type, the other event's payload", async () => {
    const all = await events();
    const alert = all["errorAlert"] as Node;
    expect(typeof alert?.["schema"], "posthog.events.errorAlert").toBe("object");
    for (const path of ["project", "project.id", "issue", "issue.id", "issue.name", "issue.url", "issue.status"]) expect(decodes(alert, setAt(POSTHOG_ALERT, path, undefined)), `${path} left out`).toBe(false);
    for (const [path, value] of [["project.id", 1], ["project", "1"], ["issue.id", 7], ["issue.name", null], ["issue.url", 5], ["issue", []], ["issue.description", 5]] as const) {
      expect(decodes(alert, setAt(POSTHOG_ALERT, path, value as never)), `${path} = ${JSON.stringify(value)}`).toBe(false);
    }
    expect(decodes(alert, POSTHOG_RESOLVED), "a resolved issue is not an alert").toBe(false);
    expect(decodes(all["errorResolved"], POSTHOG_ALERT), "an alert is not a resolve").toBe(false);
    for (const path of ["project.id", "issue.id", "issue.status"]) expect(decodes(all["errorResolved"], setAt(POSTHOG_RESOLVED, path, undefined)), `resolved: ${path} left out`).toBe(false);
    for (const wrong of [null, "alert", [], {}, 7]) expect(decodes(alert, wrong), JSON.stringify(wrong)).toBe(false);
  });

  it("an alert names no account (the gate's unnamed sender), and its identity is its issue and its kind: a resolve of the same issue, or another issue, is another event", async () => {
    const all = await events();
    expect(fn(all["errorAlert"], "actor", "posthog.events.errorAlert")(POSTHOG_ALERT), "no account: PostHog has no sender").toBeUndefined();
    const alertId = fn(all["errorAlert"], "id", "posthog.events.errorAlert");
    const resolvedId = fn(all["errorResolved"], "id", "posthog.events.errorResolved");
    const one = alertId(POSTHOG_ALERT);
    expect(typeof one).toBe("string");
    expect(alertId(JSON.parse(JSON.stringify(POSTHOG_ALERT)))).toBe(one);
    expect(alertId(setAt(POSTHOG_ALERT, "issue.id", "0190f5d8-0000-7000-8000-000000000002"))).not.toBe(one);
    expect(resolvedId(POSTHOG_RESOLVED)).not.toBe(one);
  });
});
