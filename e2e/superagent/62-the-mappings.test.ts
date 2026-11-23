// Check 62 (Goal 17 slice 10): each mapping makes the right trigger. A source kind is pure functions over an event's payload
// (GOAL17-source-from, "The types"), so each is called here with the payloads the services send (connections.ts, slack-events.ts)
// and what it answers is judged against literals written from the record: the kind, the thread key (persisted forever, so a
// literal), the text, the address a reply goes to, `addressed`, which events listen under a configuration, how a reply and a
// history are made, and what the executor's environment holds. A mapping never names the author: that is the event's actor (61).
// Today GitHub's and Slack's mappings exist (slice 5) and are judged; PostHog's has no file until slice 11.
import { describe, expect, it } from "vitest";
import {
  CHECK_ON_NO_PR, CHECK_ON_PR, COMMENT_CREATED, COMMENT_EDITED, GITHUB_CONFIG, ISSUE_ID, ISSUE_OPENED, POSTHOG_ALERT, POSTHOG_CONFIG, POSTHOG_RESOLVED,
  PR_CLOSED, REVIEW_COMMENT_CREATED, REVIEW_SUBMITTED, SLACK_ME_MENTION, setAt,
} from "./connections.ts";
import { ctx, sourceKind } from "./sources.ts";
import { APP_MENTION, BOT_MESSAGE, THREAD_REPLY, USER_MESSAGE } from "./slack-events.ts";
import { SLACK_CONFIG } from "./connections.ts";

const ADDR = { repository: "acme/widgets", number: 12 };
const OBSERVED = { listed: "explicit", unlisted: "none", unnamed: "none" };
const INFERRED = { listed: "none", unlisted: "none", unnamed: "inferred" };

describe("62 github: each event makes the trigger the record says", () => {
  const spec = async () => (await sourceKind("github")).spec;
  const c = ctx(GITHUB_CONFIG);

  it("a comment: kind comment, thread `issue/<number>`, its text and url, and where a reply goes; a mention of the agent's login addresses it", async () => {
    expect((await spec()).on["issueComment"]!(COMMENT_CREATED, c)).toEqual({
      kind: "comment", thread: "issue/12", text: "@agent fix the flaky login test", url: "https://github.com/acme/widgets/issues/12#issuecomment-9001",
      addressed: "mention", channel: ADDR,
    });
  });

  it("`addressed` is there only when the text mentions the login as a word: not for no mention, an email address or a longer login, and in any case", async () => {
    const on = (await spec()).on["issueComment"]!;
    const said = (body: string) => on(setAt(COMMENT_CREATED, "comment.body", body), c);
    expect(said("please fix the flaky login test")).not.toHaveProperty("addressed");
    expect(said("mail agent@example.com")).not.toHaveProperty("addressed");
    expect(said("@agentsmith can you look")).not.toHaveProperty("addressed");
    expect(said("@agent-bot can you look"), "a longer name with a dash is another account").not.toHaveProperty("addressed");
    expect(said("me@agent.com"), "an email address").not.toHaveProperty("addressed");
    expect(said("cc @agent_two"), "a longer name with an underscore").not.toHaveProperty("addressed");
    expect(said("(@agent)")).toHaveProperty("addressed", "mention");
    expect(said("hi @agent, thanks")).toHaveProperty("addressed", "mention");
    expect(said("thanks, @Agent!")).toHaveProperty("addressed", "mention");
    expect(said("@agent")).toHaveProperty("addressed", "mention");
    expect(on(COMMENT_CREATED, { config: GITHUB_CONFIG, me: { id: "9001", login: "helper" } }), "another login, another answer").not.toHaveProperty("addressed");
  });

  it("an action the mapping does not take makes nothing: a deleted comment, a labeled or assigned issue", async () => {
    const on = (await spec()).on;
    expect(on["issueComment"]!(setAt(COMMENT_CREATED, "action", "deleted"), c)).toBeUndefined();
    expect(on["issues"]!(setAt(ISSUE_OPENED, "action", "labeled"), c)).toBeUndefined();
    expect(on["issues"]!(setAt(ISSUE_OPENED, "action", "assigned"), c)).toBeUndefined();
    expect(on["issueComment"]!(COMMENT_EDITED, c), "an edit is taken").toBeDefined();
    expect(on["issues"]!(setAt(ISSUE_OPENED, "action", "reopened"), c), "a reopen is taken").toBeDefined();
  });

  it("a review, a review's line comment and a check each address the agent only when their words mention it", async () => {
    const on = (await spec()).on;
    expect(on["pullRequestReview"]!(setAt(REVIEW_SUBMITTED, "review.body", "@agent please fix"), c)).toHaveProperty("addressed", "mention");
    expect(on["pullRequestReview"]!(REVIEW_SUBMITTED, c)).not.toHaveProperty("addressed");
    expect(on["pullRequestReviewComment"]!(setAt(REVIEW_COMMENT_CREATED, "comment.body", "@agent rename this"), c)).toHaveProperty("addressed", "mention");
    expect(on["pullRequestReviewComment"]!(REVIEW_COMMENT_CREATED, c)).not.toHaveProperty("addressed");
    expect(on["checkRun"]!(setAt(CHECK_ON_PR, "check_run.name", "@agent verify"), c)).toHaveProperty("addressed", "mention");
    expect(on["checkRun"]!(CHECK_ON_PR, c)).not.toHaveProperty("addressed");
  });

  it("an edited comment is the same thread, with the new text", async () => {
    const t = (await spec()).on["issueComment"]!(COMMENT_EDITED, c);
    expect([t.thread, t.text, t.kind]).toEqual(["issue/12", "@agent fix the flaky login test, please", "comment"]);
  });

  it("a thread follows the number: the same comment on issue 13 is thread `issue/13`, and its reply goes to 13", async () => {
    const t = (await spec()).on["issueComment"]!(setAt(COMMENT_CREATED, "issue.number", 13), c);
    expect([t.thread, t.channel]).toEqual(["issue/13", { repository: "acme/widgets", number: 13 }]);
  });

  it("a review, and a review's line comment, are kind review on their pull request's thread (a pull request's thread is its number)", async () => {
    const on = (await spec()).on;
    expect(on["pullRequestReview"]!(REVIEW_SUBMITTED, c)).toEqual({
      kind: "review", thread: "issue/14", text: "This needs a test.", url: "https://github.com/acme/widgets/pull/14#pullrequestreview-7001", channel: { repository: "acme/widgets", number: 14 },
    });
    expect(on["pullRequestReview"]!(setAt(REVIEW_SUBMITTED, "review.body", null), c).text, "an approval with no words has no text, not `null`").toBe("");
    expect(on["pullRequestReviewComment"]!(REVIEW_COMMENT_CREATED, c)).toEqual({
      kind: "review", thread: "issue/14", text: "Rename this.", url: "https://github.com/acme/widgets/pull/14#discussion_r9001", channel: { repository: "acme/widgets", number: 14 },
    });
  });

  it("an opened issue: kind issue on its own thread, its title and body in the text, addressed when either mentions the agent", async () => {
    const on = (await spec()).on["issues"]!;
    const t = on(ISSUE_OPENED, c);
    expect([t.kind, t.thread, t.url, t.channel, t.addressed]).toEqual(["issue", "issue/15", "https://github.com/acme/widgets/issues/15", { repository: "acme/widgets", number: 15 }, "mention"]);
    expect(t.text).toContain("Slug parser drops dashes");
    expect(t.text).toContain("@agent can you look?");
    const quiet = on(setAt(ISSUE_OPENED, "issue.body", "no one is asked"), c);
    expect(quiet).not.toHaveProperty("addressed");
    expect(on(setAt(setAt(ISSUE_OPENED, "issue.body", "plain"), "issue.title", "@agent look"), c)).toHaveProperty("addressed", "mention");
  });

  it("a finished check is kind check on its pull request's thread, saying which check and how it ended; a check on no pull request makes nothing", async () => {
    const on = (await spec()).on["checkRun"]!;
    const t = on(CHECK_ON_PR, c);
    expect([t.kind, t.thread, t.url, t.channel]).toEqual(["check", "issue/14", "https://github.com/acme/widgets/runs/5001", { repository: "acme/widgets", number: 14 }]);
    expect(t.text).toContain("ci");
    expect(t.text).toContain("failure");
    expect(on(CHECK_ON_NO_PR, c)).toBeUndefined();
  });

  it("a mapping never says who wrote it, and sends nothing else: no author, no actor, only the record's keys", async () => {
    const on = (await spec()).on;
    for (const t of [on["issueComment"]!(COMMENT_CREATED, c), on["pullRequestReview"]!(REVIEW_SUBMITTED, c), on["issues"]!(ISSUE_OPENED, c), on["checkRun"]!(CHECK_ON_PR, c)]) {
      expect(Object.keys(t).filter((k) => !["kind", "thread", "text", "url", "addressed", "also", "channel", "meta"].includes(k))).toEqual([]);
    }
  });

  it("only a pull request's close closes its thread: closed on `issue/<number>`, and opened, or any other event, is not a close", async () => {
    const closed = (await spec()).closed!["pullRequest"]!;
    expect(closed(PR_CLOSED)).toBe("issue/14");
    expect(closed(setAt(PR_CLOSED, "action", "opened"))).toBeUndefined();
    expect(closed(setAt(PR_CLOSED, "pull_request.number", 15))).toBe("issue/15");
  });

  it("a connection hears its own repository, and only the groups of events its `events` lists: issues, comments, reviews, checks", async () => {
    const scope = (await spec()).scope;
    const m = (kind: string, repository = "acme/widgets") => ({ kind, thread: "issue/1", text: "", channel: { repository, number: 1 } });
    for (const [kind, group] of [["issue", "issues"], ["comment", "comments"], ["review", "reviews"], ["check", "checks"]] as const) {
      expect(scope(GITHUB_CONFIG, m(kind)), `${kind} when all four are listed`).toEqual({ listened: true, observed: true, row: "acme/widgets" });
      expect(scope({ ...GITHUB_CONFIG, events: [group] }, m(kind)).listened, `${kind} when only ${group} is listed`).toBe(true);
      expect(scope({ ...GITHUB_CONFIG, events: ["issues", "comments", "reviews", "checks"].filter((g) => g !== group) }, m(kind)).listened, `${kind} when ${group} is left out`).toBe(false);
    }
    expect(scope(GITHUB_CONFIG, m("comment", "acme/other")).listened, "another repository").toBe(false);
  });

  it("a reply is a comment on the issue, with the outgoing message's key hidden in it; it landed if a message on the thread carries that key", async () => {
    const { reply } = await spec();
    expect(reply!.args({ address: ADDR, text: "On it.", key: "out_01" })).toEqual({ owner: "acme", repo: "widgets", issue_number: 12, body: "On it.\n<!-- orthograph:out_01 -->" });
    expect(reply!.args({ address: { repository: "acme/other", number: 3 }, text: "x", key: "out_02" })).toMatchObject({ owner: "acme", repo: "other", issue_number: 3 });
    const sent = { id: "1", from: "9001", at: "2026-11-23T09:00:00Z", text: "On it.\n<!-- orthograph:out_01 -->" };
    expect(reply!.landed(sent, "out_01")).toBe(true);
    expect(reply!.landed(sent, "out_02"), "another message's key").toBe(false);
    expect(reply!.landed({ ...sent, text: "On it." }, "out_01"), "no key in it").toBe(false);
    expect(reply!.landed({ ...sent, text: "On it.\n<!-- orthograph:out_010 -->" }, "out_01"), "a longer key that starts with this one").toBe(false);
    expect(reply!.landed({ ...sent, text: "On it.\n<!-- orthograph:xout_01 -->" }, "out_01"), "a longer key that ends with this one").toBe(false);
  });

  it("a history is the issue's comments, a page at a time, each as a message with its id, sender and time", async () => {
    const { history } = await spec();
    expect(history!.args(ADDR)).toMatchObject({ owner: "acme", repo: "widgets", issue_number: 12 });
    expect(history!.args(ADDR, "2")).toMatchObject({ owner: "acme", repo: "widgets", issue_number: 12, page: 2 });
    const answer = [{ id: 11, user: { id: 583231 }, created_at: "2026-11-23T09:00:00Z", body: "first" }, { id: 12, user: null, created_at: "2026-11-23T09:05:00Z", body: null }];
    expect(history!.page(answer).messages).toEqual([
      { id: "11", from: "583231", at: "2026-11-23T09:00:00Z", text: "first" }, { id: "12", from: "", at: "2026-11-23T09:05:00Z", text: "" },
    ]);
    // a page is full when it holds as many comments as the request asked for (`per_page`, which the args name); a full page has a next page, a short one is the last
    const per = history!.args(ADDR).per_page as number;
    expect(Number.isInteger(per) && per > 0, "the args ask for a page size, `per_page`").toBe(true);
    const full = Array.from({ length: per }, (_, i) => ({ id: i + 1, user: { id: 1 }, created_at: "2026-11-23T09:00:00Z", body: "x" }));
    expect(history!.page(full, undefined).next, "a full first page").toBe("2");
    expect(history!.page(full, "2").next, "a full second page").toBe("3");
    expect(history!.page(full.slice(1), "2").next, "a short page is the last").toBeUndefined();
    expect(history!.page([], undefined).next).toBeUndefined();
  });

  it("its part of the policy has one admission row, the repository, that an explicit mention from a listed account passes and nothing else does", async () => {
    expect((await spec()).policyPart.rows(GITHUB_CONFIG)).toEqual([{ id: "acme/widgets", label: "acme/widgets", cells: OBSERVED }]);
  });

  it("a repository's collaborators become accounts a person may list: their stable id as a string, their login, and whether each is a bot", async () => {
    const { policyPart } = await spec();
    expect(policyPart.sync, "policyPart.sync").toBeDefined();
    const accounts = (policyPart.sync as { accounts: (a: unknown) => unknown }).accounts;
    expect(accounts([{ id: 583231, login: "octocat", type: "User" }, { id: 41898282, login: "github-actions[bot]", type: "Bot" }])).toEqual([
      { id: "583231", login: "octocat", bot: false }, { id: "41898282", login: "github-actions[bot]", bot: true },
    ]);
    expect(accounts([])).toEqual([]);
  });

  it("the executor's environment names the repository and the number, and gives them for a trigger", async () => {
    const { environment } = await spec();
    expect(Object.keys(environment.variables).sort()).toEqual(["GITHUB_NUMBER", "GITHUB_REPOSITORY"]);
    expect(environment.of({ kind: "comment", thread: "issue/12", text: "", channel: ADDR })).toEqual({ GITHUB_REPOSITORY: "acme/widgets", GITHUB_NUMBER: "12" });
  });
});

describe("62 slack: each event makes the trigger the record says", () => {
  const spec = async () => (await sourceKind("slack")).spec;
  const c = ctx(SLACK_CONFIG);

  it("an app mention: kind mention, addressed, the thread is its channel and its own time", async () => {
    expect((await spec()).on["appMention"]!(APP_MENTION, c)).toEqual({
      kind: "mention", thread: "C0LAN2Q65:1515449522.000016", text: "<@U0LAN0Z89> is it everything a river should be?", addressed: "mention",
      channel: { channel: "C0LAN2Q65", ts: "1515449522.000016" },
    });
  });

  it("a mention inside a thread is on the thread's root, not its own time", async () => {
    const t = (await spec()).on["appMention"]!(setAt(setAt(APP_MENTION, "event.thread_ts", "1515449000.000001"), "event.ts", "1515449522.000016"), c);
    expect([t.thread, t.channel]).toEqual(["C0LAN2Q65:1515449000.000001", { channel: "C0LAN2Q65", ts: "1515449000.000001" }]);
  });

  it("a message in a channel: kind message, never addressed; a reply is on its parent's thread, so it is the same thread as the parent", async () => {
    const on = (await spec()).on["message"]!;
    const parent = on(USER_MESSAGE, c);
    expect(parent).toEqual({ kind: "message", thread: "C024BE91L:1355517523.000005", text: "Can someone look at the slug parser?", channel: { channel: "C024BE91L", ts: "1355517523.000005" } });
    const reply = on(THREAD_REPLY, c);
    expect([reply.thread, reply.channel, reply.text]).toEqual([parent.thread, parent.channel, "It fails on dashes."]);
  });

  it("a direct message: kind direct, addressed direct", async () => {
    const t = (await spec()).on["message"]!(setAt(setAt(USER_MESSAGE, "event.channel_type", "im"), "event.channel", "D024BE91L"), c);
    expect([t.kind, t.addressed, t.thread]).toEqual(["direct", "direct", "D024BE91L:1355517523.000005"]);
  });

  it("a bot's message and every subtype but a shared file and a broadcast reply (an edit, a deletion, a join) make nothing", async () => {
    const on = (await spec()).on["message"]!;
    expect(on(BOT_MESSAGE, c)).toBeUndefined();
    for (const subtype of ["message_changed", "message_deleted", "channel_join", "bot_message", "me_message", "thread_broadcast_deleted"]) {
      expect(on(setAt(USER_MESSAGE, "event.subtype", subtype), c), subtype).toBeUndefined();
    }
    expect(on(setAt(USER_MESSAGE, "event.bot_id", "B19LU7CSY"), c)).toBeUndefined();
  });

  it("a shared file and a reply also sent to the channel are a person's messages: they make a trigger on their thread", async () => {
    const on = (await spec()).on["message"]!;
    const shared = on(setAt(USER_MESSAGE, "event.subtype", "file_share"), c);
    expect([shared?.kind, shared?.thread]).toEqual(["message", "C024BE91L:1355517523.000005"]);
    const broadcast = on(setAt(setAt(THREAD_REPLY, "event.subtype", "thread_broadcast"), "event.text", "also to the channel"), c);
    expect([broadcast?.kind, broadcast?.thread, broadcast?.text]).toEqual(["message", "C024BE91L:1355517523.000005", "also to the channel"]);
  });

  it("the agent's own message is dropped: a message whose user is `me`", async () => {
    const on = (await spec()).on["message"]!;
    expect(on(setAt(USER_MESSAGE, "event.user", "U0LAN0Z89"), c)).toBeUndefined();
    expect(on(setAt(USER_MESSAGE, "event.user", "U0LAN0Z88"), c), "another user").toBeDefined();
  });

  it("a message that mentions the agent is addressed, as its app mention is, whichever of the two arrives first; one that mentions someone else is not", async () => {
    const on = (await spec()).on;
    const text = `${SLACK_ME_MENTION} is the build green?`;
    const asMessage = on["message"]!(setAt(USER_MESSAGE, "event.text", text), c);
    expect([asMessage?.kind, asMessage?.addressed]).toEqual(["message", "mention"]);
    expect(on["appMention"]!(setAt(setAt(APP_MENTION, "event.text", text), "event.channel", "C024BE91L"), c).addressed).toBe("mention");
    expect(on["message"]!(setAt(USER_MESSAGE, "event.text", "<@U0OTHER000> is the build green?"), c)).not.toHaveProperty("addressed");
    expect(on["message"]!(setAt(USER_MESSAGE, "event.text", "U0LAN0Z89 without the brackets"), c)).not.toHaveProperty("addressed");
  });

  it("a connection hears its channels and, if it takes them, direct messages; a mention is not observed, a message is; the row is the channel", async () => {
    const scope = (await spec()).scope;
    const m = (kind: string, channel: string) => ({ kind, thread: "x", text: "", channel: { channel, ts: "1.000001" } });
    expect(scope(SLACK_CONFIG, m("message", "C024BE91L"))).toEqual({ listened: true, observed: true, row: "C024BE91L" });
    expect(scope(SLACK_CONFIG, m("message", "C0OTHER000")).listened).toBe(false);
    expect(scope(SLACK_CONFIG, m("mention", "C024BE91L"))).toMatchObject({ listened: true, observed: false });
    expect(scope(SLACK_CONFIG, m("direct", "D024BE91L"))).toEqual({ listened: true, observed: true, row: "D024BE91L" });
    expect(scope({ ...SLACK_CONFIG, directMessages: false }, m("direct", "D024BE91L")).listened).toBe(false);
  });

  it("a reply is a post into the thread with the key in its metadata; it landed if a message on the thread carries that key", async () => {
    const { reply } = await spec();
    expect(reply!.args({ address: { channel: "C024BE91L", ts: "1355517523.000005" }, text: "On it.", key: "out_01" })).toEqual({
      channel: "C024BE91L", thread_ts: "1355517523.000005", text: "On it.", metadata: { event_type: "orthograph", event_payload: { key: "out_01" } },
    });
    const sent = { id: "1355517600.000007", from: "B0BOT", at: "1355517600.000007", text: "On it.", meta: { key: "out_01" } };
    expect(reply!.landed(sent, "out_01")).toBe(true);
    expect(reply!.landed(sent, "out_02")).toBe(false);
    expect(reply!.landed({ ...sent, meta: undefined }, "out_01")).toBe(false);
  });

  it("a history is the thread's replies, a cursor at a time, each as a message; a bot's message has its bot id as sender; the key comes back in `meta`", async () => {
    const { history } = await spec();
    const a = { channel: "C024BE91L", ts: "1355517523.000005" };
    expect(history!.args(a)).toEqual({ channel: "C024BE91L", ts: "1355517523.000005" });
    expect(history!.args(a, "dXNlcjpVMDYx")).toEqual({ channel: "C024BE91L", ts: "1355517523.000005", cursor: "dXNlcjpVMDYx" });
    const answer = {
      ok: true, has_more: true, response_metadata: { next_cursor: "dXNlcjpVMDYx" },
      messages: [
        { ts: "1355517523.000005", user: "U024BE7LH", text: "parent" },
        { ts: "1355517600.000007", bot_id: "B0BOT", text: "On it.", metadata: { event_type: "orthograph", event_payload: { key: "out_01" } } },
      ],
    };
    expect(history!.page(answer)).toEqual({
      messages: [
        { id: "1355517523.000005", from: "U024BE7LH", at: "1355517523.000005", text: "parent" },
        { id: "1355517600.000007", from: "B0BOT", at: "1355517600.000007", text: "On it.", meta: { key: "out_01" } },
      ],
      next: "dXNlcjpVMDYx",
    });
    expect(history!.page({ ok: true, messages: [], response_metadata: { next_cursor: "" } }).next, "an empty cursor is the last page").toBeUndefined();
  });

  it("a user group's members become accounts a person may list: the user id is the id and the login, and none is a bot", async () => {
    const sync = (await spec()).policyPart.sync as { accounts: (a: unknown) => unknown } | undefined;
    expect(sync, "policyPart.sync").toBeDefined();
    expect(sync!.accounts({ ok: true, users: ["U060R4BJ4", "W123A4BC5"] })).toEqual([{ id: "U060R4BJ4", login: "U060R4BJ4", bot: false }, { id: "W123A4BC5", login: "W123A4BC5", bot: false }]);
    expect(sync!.accounts({ ok: true, users: [] })).toEqual([]);
  });

  it("its part of the policy has one row per channel; the executor's environment names the channel and the thread", async () => {
    const { policyPart, environment } = await spec();
    expect(policyPart.rows({ ...SLACK_CONFIG, channels: ["C024BE91L", "C0LAN2Q65"] })).toEqual([
      { id: "C024BE91L", label: "C024BE91L", cells: OBSERVED }, { id: "C0LAN2Q65", label: "C0LAN2Q65", cells: OBSERVED },
    ]);
    expect(Object.keys(environment.variables).sort()).toEqual(["SLACK_CHANNEL", "SLACK_THREAD"]);
    expect(environment.of({ kind: "message", thread: "x", text: "", channel: { channel: "C024BE91L", ts: "1355517523.000005" } })).toEqual({ SLACK_CHANNEL: "C024BE91L", SLACK_THREAD: "1355517523.000005" });
  });
});

describe("62 posthog: an alert makes the trigger the record says", () => {
  const spec = async () => (await sourceKind("posthog")).spec;
  const c = ctx(POSTHOG_CONFIG);
  const ADDRESS = { project: "1", issue: ISSUE_ID };

  it("an error alert: kind errorIssue, the thread `error/<issue id>`, the name and description as text, the issue's url; it is never addressed, and names no author", async () => {
    const t = (await spec()).on["errorAlert"]!(POSTHOG_ALERT, c);
    expect(t).not.toHaveProperty("timestamp");
    expect(t).toEqual({
      kind: "errorIssue", thread: `error/${ISSUE_ID}`, text: "TypeError: Cannot read properties of undefined (reading 'slug')",
      url: `https://us.posthog.com/project/1/error_tracking/${ISSUE_ID}`, channel: ADDRESS,
    });
  });

  it("an alert with no description is its name alone, and a project and an issue are what a reply would be addressed to", async () => {
    const t = (await spec()).on["errorAlert"]!(setAt(setAt(POSTHOG_ALERT, "issue.description", undefined), "project.id", "2"), c);
    expect(t.text).toBe("TypeError: ");
    expect(t.channel).toEqual({ project: "2", issue: ISSUE_ID });
  });

  it("a resolved error closes its thread, and an alert does not", async () => {
    const s = await spec();
    expect(s.closed!["errorResolved"]!(POSTHOG_RESOLVED)).toBe(`error/${ISSUE_ID}`);
    expect(s.closed!["errorAlert"], "an alert is not a close").toBeUndefined();
  });

  it("it hears its project and the kinds it lists", async () => {
    const scope = (await spec()).scope;
    const m = (kind: string, project: string) => ({ kind, thread: "x", text: "", channel: { project, issue: ISSUE_ID } });
    expect(scope(POSTHOG_CONFIG, m("errorIssue", "1"))).toEqual({ listened: true, observed: true, row: "posthog" });
    expect(scope(POSTHOG_CONFIG, m("errorIssue", "2")).listened, "another project").toBe(false);
    expect(scope({ ...POSTHOG_CONFIG, kinds: [] }, m("errorIssue", "1")).listened, "a kind left out").toBe(false);
  });

  it("it has no reply: PostHog is only listened to; its history is the issue read back, as one message", async () => {
    const s = await spec();
    expect(s.reply, "nothing is posted to PostHog").toBeUndefined();
    expect(s.history!.args(ADDRESS)).toEqual({ project_id: "1", id: ISSUE_ID });
    const answer = { id: ISSUE_ID, status: "active", name: "TypeError", description: "boom", first_seen: "2026-11-23T09:00:00Z" };
    expect(s.history!.page(answer).messages).toHaveLength(1);
    expect(s.history!.page(answer).messages[0]).toMatchObject({ id: ISSUE_ID });
  });

  it("its admission row is the one the unnamed sender passes, inferred; the environment names the project and the issue", async () => {
    const { policyPart, environment } = await spec();
    expect(policyPart.rows(POSTHOG_CONFIG)).toEqual([{ id: "posthog", label: "PostHog", cells: INFERRED }]);
    expect(Object.keys(environment.variables).sort()).toEqual(["POSTHOG_ISSUE", "POSTHOG_PROJECT"]);
    expect(environment.of({ kind: "errorIssue", thread: "x", text: "", channel: ADDRESS })).toEqual({ POSTHOG_PROJECT: "1", POSTHOG_ISSUE: ISSUE_ID });
  });
});
