// 02 M4.04: a run killed with the model's reply in flight asks for that reply once more and for no committed one
// (M4-agents call 3: a request still in flight when the host dies is sent again; no provider can resume a cut stream).
// Turns green with slice 4 (M4.04, #377).
import { describe, expect, it } from "vitest";
import { config, finish, killWhen, kinds, lines, once, scenario, start, viewOf, type RunView, type Settled } from "./support.ts";

const RUN = "run-model-cut";

const cut = once(async () => {
  const where = scenario("model-cut");
  const first = start(config(where, RUN, { hold: "model" }));
  await killWhen(first, () => lines(where.out, "requests").length >= 1, "the model's first reply in flight");
  const before = await viewOf(where, RUN);
  const atKill = { requests: lines(where.out, "requests").map((r) => [r.process, r.step]), attempts: lines(where.out, "attempts").length };
  const second = await finish<{ settled: Settled; view: RunView }>(start(config(where, RUN, { process: "second", submit: false })));
  return { where, before, atKill, second };
});

describe("02 M4.04: killed with the model's reply in flight", () => {
  it("the kill lands with only the input committed and the first request unanswered", async () => {
    const { before, atKill } = await cut();
    expect(kinds(before), "what run.sqlite held when the process died").toEqual(["user"]);
    expect(atKill.requests, "model requests before the kill").toEqual([["first", 0]]);
    expect(atKill.attempts, "no tool had been called").toBe(0);
  });

  it("a fresh process finishes the run under the same id, and each committed step is in the transcript once", async () => {
    const { before, second } = await cut();
    expect(second.settled.status).toBe("done");
    expect(second.view.run).toBe(RUN);
    expect(kinds(second.view)).toEqual(["user", "assistant", "tool-result", "assistant"]);
    expect(new Set(second.view.entries.map((e) => e.id)).size).toBe(4);
    expect(second.view.entries[0]!.id, "the committed input is the very one from before the kill").toBe(before.entries[0]!.id);
    expect(second.view.entries[2]!.text).toBe("recorded first new");
  });

  it("exactly one repeat of the unfinished request, and none of a committed one", async () => {
    const { where } = await cut();
    expect(lines(where.out, "requests").map((r) => [r.process, r.step])).toEqual([["first", 0], ["second", 0], ["second", 1]]);
  });

  it("the tool then runs once, under one request key, and its effect lands once", async () => {
    const { where } = await cut();
    const attempts = lines<{ key: string }>(where.out, "attempts");
    expect(attempts.map((a) => a.process)).toEqual(["second"]);
    expect(lines<{ key: string }>(where.out, "effects").map((e) => e.key)).toEqual([attempts[0]!.key]);
  });
});
