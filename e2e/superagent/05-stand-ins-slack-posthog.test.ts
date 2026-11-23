// Check 05 (Goal 17 slice 3): each Slack and PostHog call the superagent includes passes against its stand-in. Judged
// against the specs' own schemas. Each stand-in is the process `orthograph.standIn` names (README: "The stand-in"), and
// starts with this world, the same every time:
//   Slack:   channel C024BE91L (#eng) with no messages; the bot is U0BOT0001; any non-empty bearer token is the bot's.
//   PostHog: project "1" with three error tracking issues, two `active` and one `resolved`; any non-empty bearer token.
import { spawnSync } from "node:child_process";
import { afterAll, describe, expect, it } from "vitest";
import { appPlugin } from "./needs.ts";
import { trimmed } from "./pins.ts";
import { at, build, load, once, type Node } from "./plugin.ts";
import { problems } from "./schema.ts";
import { startStandIn, type Running } from "./servers.ts";
import { operationNamed, readSpec } from "./spec.ts";

const boot = async (name: "slack" | "posthog", token: string, started: { current: Running | undefined }) => {
  build(appPlugin(name));
  const stand = await startStandIn(appPlugin(name));
  started.current = stand;
  const calls = ((await load(appPlugin(name), "./client"))["client"] as (o: unknown) => Node)({ baseUrl: stand.url, token })["calls"] as Node;
  return { stand, calls };
};
const fails = (promise: Promise<unknown>) => promise.then(() => undefined, (e: unknown) => e);
const gone = async (stand: Running) => {
  await stand.stop();
  expect(() => process.kill(stand.pid, 0)).toThrow();
  expect(spawnSync("pgrep", ["-fl", stand.dir], { encoding: "utf8" }).stdout.trim()).toBe("");
};

describe("05 slack: the calls pass against the stand-in", () => {
  const spec = readSpec(trimmed("slack"));
  const C = "C024BE91L";
  const [NAME, TOKEN] = ["slack", "xoxb-test"] as const;
  const started: { current: Running | undefined } = { current: undefined };
  const world = once(() => boot(NAME, TOKEN, started));
  const fits = (call: string, value: unknown) => expect(problems(spec, operationNamed(spec, call).success!.schema, value), `${call}'s answer fits the spec`).toEqual([]);
  afterAll(async () => { await started.current?.stop(); });

  it("a message posts once, with the time Slack gives it, and times only go up", async () => {
    const { calls } = await world();
    const parent = await at(calls, "chatPostMessage")({ channel: C, text: "Starting on it." });
    fits("chatPostMessage", parent);
    expect(parent).toMatchObject({ ok: true, channel: C, message: { text: "Starting on it.", type: "message" } });
    expect(parent.ts).toMatch(/^\d{10}\.\d{6}$/);
    expect(parent.message.ts).toBe(parent.ts);
    const next = await at(calls, "chatPostMessage")({ channel: C, text: "Second." });
    expect(Number(next.ts)).toBeGreaterThan(Number(parent.ts));
  });

  it("a reply in a thread comes back with its thread, in the order sent, and a thread holds only its own", async () => {
    const { calls } = await world();
    const parent = await at(calls, "chatPostMessage")({ channel: C, text: "Thread parent." });
    const other = await at(calls, "chatPostMessage")({ channel: C, text: "Another parent." });
    const one = await at(calls, "chatPostMessage")({ channel: C, text: "First reply.", thread_ts: parent.ts });
    await at(calls, "chatPostMessage")({ channel: C, text: "Not this thread.", thread_ts: other.ts });
    const two = await at(calls, "chatPostMessage")({ channel: C, text: "Second reply.", thread_ts: parent.ts });
    expect(one.message.thread_ts).toBe(parent.ts);
    const replies = await at(calls, "conversationsReplies")({ channel: C, ts: parent.ts });
    fits("conversationsReplies", replies);
    expect(replies.ok).toBe(true);
    expect(replies.has_more ?? false).toBe(false);
    expect(replies.messages.map((m: Node) => [m.ts, m.text])).toEqual([[parent.ts, "Thread parent."], [one.ts, "First reply."], [two.ts, "Second reply."]]);
    for (const m of replies.messages) expect(m.thread_ts).toBe(parent.ts);
  });

  it("fails as Slack does, in a 200 with ok false: no channel, no text, no such thread, no token", async () => {
    const { stand, calls } = await world();
    expect(await fails(at(calls, "chatPostMessage")({ channel: "C0NOPE0000", text: "x" }))).toMatchObject({ code: "channel_not_found" });
    expect(await fails(at(calls, "chatPostMessage")({ channel: C }))).toMatchObject({ code: "no_text" });
    expect(await fails(at(calls, "chatPostMessage")({ channel: C, text: "" }))).toMatchObject({ code: "no_text" });
    expect(await fails(at(calls, "conversationsReplies")({ channel: C, ts: "1.000000" }))).toMatchObject({ code: "thread_not_found" });
    const real = await at(calls, "chatPostMessage")({ channel: C, text: "A real parent." });
    expect(await fails(at(calls, "conversationsReplies")({ channel: "C0NOPE0000", ts: real.ts }))).toMatchObject({ code: "channel_not_found" });
    const noToken = await fetch(`${stand.url}/api/conversations.replies?channel=${C}&ts=${String(real.ts)}`);
    expect(await noToken.json()).toMatchObject({ ok: false, error: "not_authed" });
    const unauthed = await fetch(`${stand.url}/api/chat.postMessage`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ channel: C, text: "x" }) });
    expect(unauthed.status).toBe(200);
    expect(await unauthed.json()).toMatchObject({ ok: false, error: "not_authed" });
  });

  it("lists a user group's members (the policy's sync): user ids Slack gives, one each; a group that isn't there fails as Slack does", async () => {
    const { calls } = await world();
    const listed = await at(calls, "usergroupsUsersList")({ usergroup: "S0614TZR7" });
    fits("usergroupsUsersList", listed);
    expect(listed.ok).toBe(true);
    expect(listed.users.length).toBeGreaterThan(0);
    for (const id of listed.users) expect(id).toMatch(/^[UW][A-Z0-9]{8,}$/);
    expect(new Set(listed.users).size).toBe(listed.users.length);
    expect(await fails(at(calls, "usergroupsUsersList")({ usergroup: "S0NOPE0000" }))).toMatchObject({ code: "no_such_subteam" });
  });

  it("stops when told, by its id, leaving nothing running and no folder", async () => { await gone((await world()).stand); });
});

describe("05 posthog: the calls pass against the stand-in", () => {
  const spec = readSpec(trimmed("posthog"));
  const P = { project_id: "1" };
  const [NAME, TOKEN] = ["posthog", "phx_test"] as const;
  const started: { current: Running | undefined } = { current: undefined };
  const world = once(() => boot(NAME, TOKEN, started));
  const fits = (call: string, value: unknown) => expect(problems(spec, operationNamed(spec, call).success!.schema, value), `${call}'s answer fits the spec`).toEqual([]);
  afterAll(async () => { await started.current?.stop(); });

  it("lists the three issues, a page at a time, and reads each one back the same", async () => {
    const { calls } = await world();
    const all = await at(calls, "errorTrackingIssuesList")(P);
    fits("errorTrackingIssuesList", all);
    expect(all.count).toBe(3);
    expect(all.results.map((i: Node) => i.status).sort()).toEqual(["active", "active", "resolved"]);
    expect(new Set(all.results.map((i: Node) => i.id)).size).toBe(3);
    const first = await at(calls, "errorTrackingIssuesList")({ ...P, limit: 1 });
    expect(first.results).toHaveLength(1);
    expect(first).toMatchObject({ count: 3, next: expect.any(String) });
    const last = await at(calls, "errorTrackingIssuesList")({ ...P, limit: 1, offset: 2 });
    expect(last.results).toHaveLength(1);
    expect(last.next).toBeNull();
    expect(new URL(first.next).searchParams.get("offset"), "next is the following page").toBe("1");
    expect(new URL(first.next).pathname).toBe("/api/projects/1/error_tracking/issues/");
    expect(first.previous).toBeNull();
    const middle = await at(calls, "errorTrackingIssuesList")({ ...P, limit: 1, offset: 2 });
    expect(new URL(middle.previous).searchParams.get("offset"), "previous is the page before").toBe("1");
    for (const issue of all.results) {
      const one = await at(calls, "errorTrackingIssuesRetrieve")({ ...P, id: issue.id });
      fits("errorTrackingIssuesRetrieve", one);
      expect(one).toMatchObject({ id: issue.id, status: issue.status, name: issue.name });
    }
  });

  it("an issue that isn't there, or a project that isn't, is a 404", async () => {
    const { stand, calls } = await world();
    expect(await fails(at(calls, "errorTrackingIssuesRetrieve")({ ...P, id: "0190f5d8-0000-7000-8000-00000000dead" }))).toMatchObject({ status: 404 });
    expect(await fails(at(calls, "errorTrackingIssuesList")({ project_id: "999" }))).toMatchObject({ status: 404 });
    const bare = await fetch(`${stand.url}/api/projects/1/error_tracking/issues/`);
    expect(bare.status).toBe(401);
    const id = (await at(calls, "errorTrackingIssuesList")(P)).results[0].id as string;
    const patch = (project: string, auth: boolean) => fetch(`${stand.url}/api/projects/${project}/error_tracking/issues/${id}/`, { method: "PATCH", headers: { "content-type": "application/json", ...(auth ? { authorization: "Bearer phx_test" } : {}) }, body: JSON.stringify({ status: "suppressed" }) });
    expect((await patch("1", false)).status, "a write with no token").toBe(401);
    expect((await patch("999", true)).status, "an update in another project").toBe(404);
    expect(await fails(at(calls, "errorTrackingIssuesRetrieve")({ project_id: "999", id }))).toMatchObject({ status: 404 });
    expect((await at(calls, "errorTrackingIssuesRetrieve")({ ...P, id })).status, "nothing changed").not.toBe("suppressed");
  });

  it("resolving one issue changes that issue only, and a status the spec doesn't allow is refused", async () => {
    const { stand, calls } = await world();
    const before = (await at(calls, "errorTrackingIssuesList")(P)).results as ReadonlyArray<Node>;
    const target = before.find((i) => i.status === "active")!;
    const done = await at(calls, "errorTrackingIssuesPartialUpdate")({ ...P, id: target.id, status: "resolved" });
    fits("errorTrackingIssuesPartialUpdate", done);
    expect(done).toMatchObject({ id: target.id, status: "resolved", name: target.name });
    const after = (await at(calls, "errorTrackingIssuesList")(P)).results as ReadonlyArray<Node>;
    expect(after.map((i) => i.status).sort()).toEqual(["active", "resolved", "resolved"]);
    for (const issue of before.filter((i) => i.id !== target.id)) expect(after.find((i) => i.id === issue.id)).toEqual(issue);
    // the client may refuse "archived" itself (the spec's enum has no such value); the stand-in must refuse it too, as PostHog does
    expect(await fails(at(calls, "errorTrackingIssuesPartialUpdate")({ ...P, id: target.id, status: "archived" }))).toBeDefined();
    const raw = await fetch(`${stand.url}/api/projects/1/error_tracking/issues/${String(target.id)}/`, { method: "PATCH", headers: { authorization: "Bearer phx_test", "content-type": "application/json" }, body: JSON.stringify({ status: "archived" }) });
    expect(raw.status).toBe(400);
    expect((await at(calls, "errorTrackingIssuesRetrieve")({ ...P, id: target.id })).status).toBe("resolved");
  });

  it("stops when told, by its id, leaving nothing running and no folder", async () => { await gone((await world()).stand); });
});
