// Check 63 (Goal 17 slice 10): the doors. `POST /_in/github` and `/_in/slack` on the app in a world (M5-reach-out Q2, and the wire
// M5-checks call 4 pins): a delivery signed as the service signs is accepted and written once, a bad signature is refused
// with nothing written, and a delivery of one comment settles once however many times, and whatever delivery id, it comes by.
// Each service signs as it publishes (connections.ts): GitHub `X-Hub-Signature-256: sha256=<hmac of the body>`, with the event in
// `X-GitHub-Event`; Slack `X-Slack-Signature: v0=<hmac of v0:<time>:<body>>` with `X-Slack-Request-Timestamp`, refused over five
// minutes old, and its URL verification challenge answered. The secrets are random test values this check makes and gives the
// world. What a delivery becomes after the door (the outbox's hop to `trigger.receive`, the account on the caller) and a poll
// of the same comment wait on GOAL17-check-harness; PostHog's door is not here (README, "Not judged").
// A comment settles once because the event's identity is the object and its own last-change time (GOAL17-connections A, B), not
// the delivery or the action. Red until slice 11 builds the doors: today the Worker has no `/_in/` route and answers 404.
import { afterAll, describe, expect, it } from "vitest";
import {
  CHECK_ON_PR, COMMENT_CREATED, githubSchemaOf, githubSpec, type Obj, COMMENT_EDITED, ISSUE_OPENED, PR_CLOSED, REVIEW_COMMENT_CREATED, REVIEW_SUBMITTED, githubSignature, setAt, slackSignature,
} from "./connections.ts";
import { problems } from "./schema.ts";
import { github, journalOf, openDoor, slack, trace, type Door } from "./door.ts";
import { githubLegacySignature } from "./connections.ts";
import { APP_MENTION, SLACK_ENVELOPES, THREAD_REPLY, USER_MESSAGE } from "./slack-events.ts";

let opened: Promise<Door> | undefined;
/** The one world of this file, started by the first test that needs it, so a failure to start fails that test by name. */
const world = () => (opened ??= openDoor());
afterAll(async () => { if (opened) await (await opened.catch(() => undefined))?.close(); });

const ACCEPTED = [200, { accepted: true }];
const SEEN = [200, { seen: true }];
const IGNORED = [200, { ignored: true }];
const BAD = [401, { _tag: "BadSignature" }];
const said = (a: { status: number; body: unknown }) => [a.status, a.body];

describe("63 github: a delivery signed as GitHub signs it", () => {
  it("is accepted, and the inbox keeps one row in its trace: an id of the github source, the operation `in:github`, the event's name", async () => {
    const door = await world();
    const t = trace();
    expect(said(await github(door, "issue_comment", COMMENT_CREATED, { trace: t.header }))).toEqual(ACCEPTED);
    const rows = await journalOf(door.url, t.id);
    expect(rows.filter((r) => r.operation === "in:github").map((r) => [r.id.startsWith("github:"), r.event])).toEqual([[true, "issueComment"]]);
    expect(rows.find((r) => r.operation === "in:github")!.fields).toMatchObject({ action: "created", comment: { id: 9001 } });
  });

  it("again, by another delivery id, is seen: a comment settles once, whatever delivery brought it, and nothing more is written", async () => {
    const door = await world();
    expect(said(await github(door, "issue_comment", setAt(COMMENT_CREATED, "comment.id", 9100)))).toEqual(ACCEPTED);
    for (const delivery of ["72d3162e-cc78-11e3-81ab-4c9367dc0958", "72d3162e-cc78-11e3-81ab-4c9367dc0959"]) {
      const t = trace();
      expect(said(await github(door, "issue_comment", setAt(COMMENT_CREATED, "comment.id", 9100), { delivery, trace: t.header })), delivery).toEqual(SEEN);
      expect(await journalOf(door.url, t.id), delivery).toEqual([]);
    }
  });

  it("a redelivery that differs in the installation, the sender or the action around the same comment is seen too: they are not part of the event", async () => {
    const door = await world();
    const comment = setAt(COMMENT_CREATED, "comment.id", 9150);
    expect(said(await github(door, "issue_comment", comment))).toEqual(ACCEPTED);
    for (const [what, again] of [
      ["another installation", { ...comment, installation: { id: 99 } }], ["another sender", setAt(comment, "sender.id", 7)], ["another action: the edit event, with its `changes`, of the same comment at the same time", setAt(setAt(setAt(COMMENT_EDITED, "comment.id", 9150), "comment.updated_at", (COMMENT_CREATED["comment"] as Obj)["updated_at"] as string), "comment.body", (COMMENT_CREATED["comment"] as Obj)["body"] as string)],
    ] as const) {
      if (what.startsWith("another action")) expect(problems(githubSpec(), githubSchemaOf("issue-comment-edited"), again), "the edit event is a payload the spec allows").toEqual([]);
      expect(said(await github(door, "issue_comment", again as never)), what).toEqual(SEEN);
    }
  });

  it("a body signed as it was written is accepted, however it was written: indented, or with `<` as \\u003c, which JSON.stringify would not give back", async () => {
    const door = await world();
    const comment = setAt(setAt(COMMENT_CREATED, "comment.id", 9160), "comment.body", "@agent a < b and a > c & d");
    const pretty = JSON.stringify(comment, null, 2);
    const escaped = JSON.stringify(setAt(comment, "comment.id", 9161)).replace(/</g, "\\u003c").replace(/>/g, "\\u003e");
    expect(escaped).not.toBe(JSON.stringify(JSON.parse(escaped)));
    expect(said(await github(door, "issue_comment", pretty)), "pretty-printed").toEqual(ACCEPTED);
    expect(said(await github(door, "issue_comment", escaped)), "escaped").toEqual(ACCEPTED);
    const t = trace();
    expect(said(await github(door, "issue_comment", pretty, { trace: t.header })), "the same pretty body again").toEqual(SEEN);
    expect(said(await github(door, "issue_comment", pretty, { signature: githubSignature(door.secrets.github, JSON.stringify(comment)) })), "signed as JSON.stringify gives it, sent as written").toEqual(BAD);
  });

  it("the same comment edited is another event, and edited again later is a third; a different comment is its own", async () => {
    const door = await world();
    const comment = (over: Record<string, unknown>) => setAt(setAt(COMMENT_EDITED, "comment.id", 9200), "comment.updated_at", over["at"] as string);
    expect(said(await github(door, "issue_comment", setAt(COMMENT_CREATED, "comment.id", 9200)))).toEqual(ACCEPTED);
    expect(said(await github(door, "issue_comment", comment({ at: "2026-11-23T09:01:00Z" })))).toEqual(ACCEPTED);
    expect(said(await github(door, "issue_comment", comment({ at: "2026-11-23T09:02:00Z" })))).toEqual(ACCEPTED);
    expect(said(await github(door, "issue_comment", comment({ at: "2026-11-23T09:02:00Z" })))).toEqual(SEEN);
    expect(said(await github(door, "issue_comment", setAt(COMMENT_CREATED, "comment.id", 9201)))).toEqual(ACCEPTED);
  });

  it("five identical deliveries at once: one accepted and four seen", async () => {
    const door = await world();
    const t = trace();
    const answers = await Promise.all([0, 1, 2, 3, 4].map(() => github(door, "issue_comment", setAt(COMMENT_CREATED, "comment.id", 9300), { trace: t.header })));
    expect(answers.map((a) => a.status)).toEqual([200, 200, 200, 200, 200]);
    expect(answers.map((a) => Object.keys(a.body).join()).sort()).toEqual(["accepted", "seen", "seen", "seen", "seen"]);
    expect((await journalOf(door.url, t.id)).filter((r) => r.operation === "in:github")).toHaveLength(1);
  });

  it("every event the app listens to is accepted, each with its own id: a review, a review comment, an opened issue, a closed pull request, a check", async () => {
    const door = await world();
    const sent: ReadonlyArray<readonly [string, ReturnType<typeof setAt>, string]> = [
      ["pull_request_review", REVIEW_SUBMITTED, "pullRequestReview"], ["pull_request_review_comment", REVIEW_COMMENT_CREATED, "pullRequestReviewComment"],
      ["issues", ISSUE_OPENED, "issues"], ["pull_request", PR_CLOSED, "pullRequest"], ["check_run", CHECK_ON_PR, "checkRun"],
    ];
    const ids = new Set<string>();
    for (const [name, payload, event] of sent) {
      const t = trace();
      expect(said(await github(door, name, payload, { trace: t.header })), name).toEqual(ACCEPTED);
      const row = (await journalOf(door.url, t.id)).find((r) => r.operation === "in:github");
      expect(row?.event, name).toBe(event);
      ids.add(row!.id);
    }
    expect(ids.size, "five events, five ids").toBe(5);
  });

  it("every way to a bad signature is refused 401 BadSignature with nothing written, and the comment's id is not used up", async () => {
    const door = await world();
    const comment = setAt(COMMENT_CREATED, "comment.id", 9400);
    const raw = JSON.stringify(comment);
    const sign = (secret: string, body: string) => githubSignature(secret, body);
    const cases: ReadonlyArray<readonly [string, string, string | null]> = [
      ["no signature header", raw, null],
      ["not a signature", raw, "garbage"],
      ["no sha256= prefix", raw, sign(door.secrets.github, raw).slice(7)],
      ["another secret", raw, sign("not-the-secret", raw)],
      ["a body altered after signing", JSON.stringify(setAt(comment, "comment.body", "@agent do something else")), sign(door.secrets.github, raw)],
      ["a signature cut short", raw, sign(door.secrets.github, raw).slice(0, 40)],
      ["a signature with a letter changed", raw, sign(door.secrets.github, raw).replace(/.$/, (c) => (c === "0" ? "1" : "0"))],
      ["a sha1 value in the sha256 header", raw, githubLegacySignature(door.secrets.github, raw)],
      ["an empty body signed for another", "", sign(door.secrets.github, raw)],
    ];
    for (const [what, body, signature] of cases) {
      const t = trace();
      expect(said(await github(door, "issue_comment", body, { signature, trace: t.header })), what).toEqual(BAD);
      expect(await journalOf(door.url, t.id), what).toEqual([]);
    }
    const t = trace();
    const legacy = await fetch(`${door.url}/_in/github`, { method: "POST", headers: { "content-type": "application/json", "x-github-event": "issue_comment", "x-github-delivery": crypto.randomUUID(), "x-hub-signature": githubLegacySignature(door.secrets.github, raw), traceparent: t.header }, body: raw });
    expect(legacy.status, "only the legacy X-Hub-Signature header, truly signed: GitHub still sends it, and the door takes the sha256 one only").toBe(401);
    expect(await journalOf(door.url, t.id)).toEqual([]);
    expect(said(await github(door, "issue_comment", comment)), "the id is still free after every refusal: a signed re-send is accepted").toEqual(ACCEPTED);
  });

  it("a bad signature on an id that was accepted is refused, not seen, and on a ping, which a good one only ignores", async () => {
    const door = await world();
    const comment = setAt(COMMENT_CREATED, "comment.id", 9450);
    expect(said(await github(door, "issue_comment", comment))).toEqual(ACCEPTED);
    expect(said(await github(door, "issue_comment", comment, { signature: githubSignature("not-the-secret", JSON.stringify(comment)) })), "bad on an accepted id").toEqual(BAD);
    expect(said(await github(door, "ping", { zen: "Keep it logically awesome.", hook_id: 1 }, { signature: null })), "unsigned ping").toEqual(BAD);
    expect(said(await github(door, "ping", { zen: "Keep it logically awesome.", hook_id: 1 }))).toEqual(IGNORED);
  });

  it("a signed delivery of an event the app does not listen to, or one it listens to that does not decode, is acknowledged and ignored, with nothing written", async () => {
    const door = await world();
    for (const [what, event, payload] of [
      ["a ping", "ping", { zen: "Keep it logically awesome.", hook_id: 1 }], ["a star", "star", { action: "created" }], ["an unknown event", "nonsense", {}],
      ["a comment with no comment in it", "issue_comment", setAt(COMMENT_CREATED, "comment", undefined)], ["a comment whose number is a string", "issue_comment", setAt(COMMENT_CREATED, "comment.id", "9001")],
      ["no event header at all", "", COMMENT_CREATED],
      ["a comment deleted, an action no mapping takes", "issue_comment", setAt(setAt(COMMENT_CREATED, "comment.id", 9500), "action", "deleted")],
      ["an issue labeled", "issues", setAt(ISSUE_OPENED, "action", "labeled")],
    ] as const) {
      const t = trace();
      expect(said(await github(door, event, payload, { trace: t.header })), what).toEqual(IGNORED);
      expect(await journalOf(door.url, t.id), what).toEqual([]);
    }
  });

  it("a mount the app does not have is 404, and anything but POST is 405", async () => {
    const door = await world();
    expect((await github(door, "issue_comment", COMMENT_CREATED, { mount: "gitlab" })).status).toBe(404);
    for (const method of ["GET", "PUT", "DELETE"]) expect((await github(door, "issue_comment", COMMENT_CREATED, { method })).status, method).toBe(405);
    expect((await fetch(`${door.url}/_in/slack`, { method: "GET" })).status, "Slack's door, GET").toBe(405);
    expect((await fetch(`${door.url}/_in/slack`, { method: "PUT", body: "{}" })).status, "Slack's door, PUT").toBe(405);
  });
});

describe("63 slack: a delivery signed as Slack signs it", () => {
  const message = (id: string, ts: string) => setAt(setAt(USER_MESSAGE, "event_id", id), "event.ts", ts);

  it("an app mention and a message are accepted, each written once with its own event's name", async () => {
    const door = await world();
    for (const [what, payload, event] of [["a mention", APP_MENTION, "appMention"], ["a message", USER_MESSAGE, "message"], ["a reply in a thread", THREAD_REPLY, "message"]] as const) {
      const t = trace();
      expect(said(await slack(door, payload, { trace: t.header })), what).toEqual(ACCEPTED);
      expect((await journalOf(door.url, t.id)).filter((r) => r.operation === "in:slack").map((r) => [r.id.startsWith("slack:"), r.event]), what).toEqual([[true, event]]);
    }
  });

  it("Slack's retry of a delivery it thought failed is seen, not written again, and another message is accepted", async () => {
    const door = await world();
    const one = message("Ev0RETRY001", "1700000000.000100");
    expect(said(await slack(door, one))).toEqual(ACCEPTED);
    const t = trace();
    expect(said(await slack(door, one, { retry: 1, trace: t.header }))).toEqual(SEEN);
    expect(await journalOf(door.url, t.id)).toEqual([]);
    expect(said(await slack(door, message("Ev0RETRY002", "1700000000.000101")))).toEqual(ACCEPTED);
    expect(said(await slack(door, message("Ev0RETRY003", "1700000000.000101"), { retry: 2 })), "a retry with a new event id and the same time").toEqual(SEEN);
  });

  it("a bad signature on a message that was already accepted is refused, not seen: a wrong secret, a stale time and no header are each 401, and the message is still one", async () => {
    const door = await world();
    const sent = message("Ev0BAD0003", "1700000000.000250");
    const raw = JSON.stringify(sent);
    const now = Math.floor(Date.now() / 1000);
    expect(said(await slack(door, sent))).toEqual(ACCEPTED);
    for (const [what, options] of [
      ["a wrong secret", { signature: slackSignature("not-the-secret", now, raw) }], ["a stale time", { at: now - 3600 }], ["no header", { signature: null }],
    ] as const) {
      const t = trace();
      expect(said(await slack(door, sent, { ...options, trace: t.header })), what).toEqual(BAD);
      expect(await journalOf(door.url, t.id), what).toEqual([]);
    }
    expect(said(await slack(door, sent)), "a signed re-send is still seen: one message").toEqual(SEEN);
  });

  it("one message that arrives as a message and as an app mention, each with its own event id, is one event: the second is seen", async () => {
    const door = await world();
    const asMention = setAt(setAt(setAt(APP_MENTION, "event.channel", "C024BE91L"), "event.ts", "1700000000.000300"), "event_id", "Ev0BOTH0001");
    const asMessage = setAt(setAt(setAt(setAt(USER_MESSAGE, "event.ts", "1700000000.000300"), "event_id", "Ev0BOTH0002"), "event.user", "U061F7AUR"), "event.text", "<@U0LAN0Z89> is the build green?");
    expect(said(await slack(door, asMessage))).toEqual(ACCEPTED);
    expect(said(await slack(door, asMention))).toEqual(SEEN);
  });

  it("the URL verification challenge, signed, is answered with its challenge, and writes nothing", async () => {
    const door = await world();
    const challenge = SLACK_ENVELOPES[0]!.payload;
    const t = trace();
    const a = await slack(door, challenge, { trace: t.header });
    expect(a.status).toBe(200);
    expect(a.text.includes(String(challenge["challenge"])), `the answer says the challenge: ${a.text}`).toBe(true);
    expect(await journalOf(door.url, t.id)).toEqual([]);
  });

  it("a bad signature on the URL verification challenge is refused too, and the challenge is not echoed", async () => {
    const door = await world();
    const challenge = SLACK_ENVELOPES[0]!.payload;
    for (const options of [{ signature: null }, { signature: slackSignature("not-the-secret", Math.floor(Date.now() / 1000), JSON.stringify(challenge)) }, { at: Math.floor(Date.now() / 1000) - 3600 }] as const) {
      const a = await slack(door, challenge, options);
      expect([a.status, a.body], JSON.stringify(Object.keys(options))).toEqual(BAD);
      expect(a.text.includes(String(challenge["challenge"]))).toBe(false);
    }
  });

  it("every way to a bad signature is refused 401 BadSignature with nothing written: no header, no time, another secret, a body or a time changed after signing, five minutes and a second old, and from the future", async () => {
    const door = await world();
    const payload = message("Ev0BAD0001", "1700000000.000200");
    const raw = JSON.stringify(payload);
    const now = Math.floor(Date.now() / 1000);
    const cases: ReadonlyArray<readonly [string, string, { signature?: string | null; at?: number; stamp?: number | null }]> = [
      ["no signature", raw, { signature: null }],
      ["no timestamp", raw, { stamp: null }],
      ["not a signature", raw, { signature: "garbage" }],
      ["no v0= prefix", raw, { signature: slackSignature(door.secrets.slack, now, raw).slice(3) }],
      ["another secret", raw, { signature: slackSignature("not-the-secret", now, raw) }],
      ["a body altered after signing", JSON.stringify(setAt(payload, "event.text", "something else")), { signature: slackSignature(door.secrets.slack, now, raw) }],
      ["a time changed after signing", raw, { signature: slackSignature(door.secrets.slack, now - 5, raw), stamp: now }],
      ["signed five minutes and ten seconds ago", raw, { at: now - 310 }],
      ["signed an hour ago", raw, { at: now - 3600 }],
      ["signed ten minutes from now", raw, { at: now + 600 }],
    ];
    for (const [what, body, options] of cases) {
      const t = trace();
      expect(said(await slack(door, body, { ...options, trace: t.header })), what).toEqual(BAD);
      expect(await journalOf(door.url, t.id), what).toEqual([]);
    }
    expect(said(await slack(door, payload)), "the event's id is still free").toEqual(ACCEPTED);
    expect(said(await slack(door, message("Ev0BAD0002", "1700000000.000201"), { at: now - 290 })), "four minutes fifty seconds old is within Slack's five").toEqual(ACCEPTED);
  });

  it("an event the app does not listen to (a reaction), signed, is acknowledged and ignored", async () => {
    const door = await world();
    const t = trace();
    expect(said(await slack(door, SLACK_ENVELOPES[1]!.payload, { trace: t.header }))).toEqual(IGNORED);
    expect(await journalOf(door.url, t.id)).toEqual([]);
  });
});
