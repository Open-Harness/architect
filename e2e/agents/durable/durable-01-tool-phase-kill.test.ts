// 01 M4.04: a run killed with its model step committed and its tool call in flight resumes from run.sqlite in a fresh
// process, finishes under the same run id, and holds each committed step once (M4-agents call 3, the first claim).
// Turns green with slice 4 (M4.04, #377). Expected values are literals here, never read back from the run they judge.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { config, finish, killWhen, kinds, lines, once, runFile, scenario, start, viewOf, type RunView, type Settled } from "./support.ts";

const RUN = "run-tool-cut";

const cut = once(async () => {
  const where = scenario("tool-cut");
  const first = start(config(where, RUN, { hold: "tool" }));
  await killWhen(first, () => lines(where.out, "attempts").length >= 1, "the tool call in flight");
  const before = await viewOf(where, RUN);
  const atKill = { requests: lines(where.out, "requests").map((r) => [r.process, r.step]), attempts: lines(where.out, "attempts").map((a) => a.process) };
  const second = await finish<{ settled: Settled; view: RunView }>(start(config(where, RUN, { process: "second", submit: false })));
  return { where, before, atKill, second };
});

describe("01 M4.04: killed in the tool phase", () => {
  it("the kill lands after the model step committed and while the tool call is in flight", async () => {
    const { before, atKill } = await cut();
    expect(kinds(before), "what run.sqlite held when the process died").toEqual(["user", "assistant"]);
    expect(before.entries[1]!.toolCalls).toEqual([{ callId: "call_1", name: "record" }]);
    expect(atKill.requests, "model requests before the kill").toEqual([["first", 0]]);
    expect(atKill.attempts, "tool attempts before the kill").toEqual(["first"]);
  });

  it("a fresh process resumes the run, finishes it under the same run id, and the transcript holds each committed step once", async () => {
    const { before, second } = await cut();
    expect(second.settled.status).toBe("done");
    expect(second.view.run).toBe(RUN);
    expect(kinds(second.view)).toEqual(["user", "assistant", "tool-result", "assistant"]);
    const ids = second.view.entries.map((e) => e.id);
    expect(new Set(ids).size, "every entry once").toBe(4);
    expect(ids.slice(0, 2), "the committed entries are the very ones from before the kill").toEqual(before.entries.map((e) => e.id));
    expect(second.view.entries[1]!.toolCalls).toEqual([{ callId: "call_1", name: "record" }]);
    expect(second.view.entries[2]!.text).toBe("recorded first new");
    expect(second.view.entries[3]!.text).toBe("All recorded.");
    // The view is exactly the shape the surface names: nothing added, nothing left out.
    expect(Object.keys(second.view).sort()).toEqual(["entries", "run", "usage"]);
    for (const entry of second.view.entries) {
      expect(Object.keys(entry).sort(), `${entry.kind} entry`).toEqual(entry.kind === "assistant" ? ["at", "id", "kind", "text", "toolCalls", "usage"] : ["at", "id", "kind", "text", "toolCalls"]);
    }
  });

  it("the provider's request count shows no committed step requested again", async () => {
    const { where } = await cut();
    expect(lines(where.out, "requests").map((r) => [r.process, r.step])).toEqual([["first", 0], ["second", 1]]);
  });

  it("the cut tool call replays under the same request key, and its effect lands once", async () => {
    const { where } = await cut();
    const attempts = lines<{ key: string }>(where.out, "attempts");
    expect(attempts.map((a) => a.process)).toEqual(["first", "second"]);
    const key = attempts[0]!.key;
    expect(typeof key).toBe("string");
    expect(key.length).toBeGreaterThan(0);
    expect(attempts[1]!.key, "a replay carries the key of the call it replays").toBe(key);
    expect(lines<{ key: string }>(where.out, "effects").map((e) => e.key), "the effect landed once").toEqual([key]);
  });

  it("the run lives in one SQLite file, .orthograph/runs/<run>/run.sqlite", async () => {
    const { where } = await cut();
    expect(readdirSync(join(where.root, ".orthograph", "runs"))).toEqual([RUN]);
    expect(readFileSync(runFile(where.root, RUN)).subarray(0, 16).toString("latin1")).toBe("SQLite format 3\0");
  });

  it("a client that retries the start with the same key after the crash adds nothing", async () => {
    const { where, second } = await cut();
    const again = await finish<{ settled: Settled; view: RunView }>(start(config(where, RUN, { process: "third", submit: true })));
    expect(again.settled.status).toBe("done");
    expect(again.view.entries.map((e) => e.id), "no entry added").toEqual(second.view.entries.map((e) => e.id));
    expect(lines(where.out, "requests"), "no request made").toHaveLength(2);
    expect(lines(where.out, "attempts"), "no tool call made").toHaveLength(2);
  });
});
