// 03 M4.04: a tool's request key is namespaced by run and by Pi's task, never the provider's call id alone
// (M4-agents call 3; spike `durable-run` finding 3: two runs that reused an id got one run's receipt for the other's call).
// The effects log stands in for an idempotent endpoint: the first request of a key lands, a repeat changes nothing, so a
// colliding key shows as a "duplicate" result and a missing effect. Turns green with slice 4 (M4.04, #377).
import { describe, expect, it } from "vitest";
import { config, finish, lines, once, scenario, start, type RunView, type Settled } from "./support.ts";

type Done = { settled: Settled; view: RunView };

const runs = once(async () => {
  const where = scenario("keys");
  // Every call below is the provider's `call_1`, in three runs and, in the last, twice in one run.
  const a = await finish<Done>(start(config(where, "run-a")));
  const b = await finish<Done>(start(config(where, "run-b", { process: "second" })));
  const again = await finish<Done>(start(config(where, "run-c", { process: "third", script: "two-tools-same-id" })));
  return { where, a, b, again };
});

describe("03 M4.04: a request key belongs to its run and its task", () => {
  it("two runs whose provider reuses a tool-call id commit two distinct keys, each landing its own effect", async () => {
    const { where, a, b } = await runs();
    expect(a.view.entries[2]!.text).toBe("recorded first new");
    expect(b.view.entries[2]!.text, "run b's call is not mistaken for run a's").toBe("recorded first new");
    const attempts = lines<{ key: string; callId: string }>(where.out, "attempts");
    const [ka, kb] = [attempts.find((x) => x.process === "first")!.key, attempts.find((x) => x.process === "second")!.key];
    expect(ka).not.toBe(kb);
    expect(lines<{ key: string }>(where.out, "effects").filter((e) => e.process !== "third").map((e) => e.key)).toEqual([ka, kb]);
  });

  it("the key says which run it is for, and is never the provider's id alone", async () => {
    const { where } = await runs();
    const attempts = lines<{ key: string; callId: string }>(where.out, "attempts");
    const byProcess = (p: string) => attempts.filter((x) => x.process === p).map((x) => x.key);
    for (const [process, run] of [["first", "run-a"], ["second", "run-b"], ["third", "run-c"]] as const) {
      for (const key of byProcess(process)) {
        expect(key, `a key of ${run}`).toContain(run);
        expect(key).not.toBe("call_1");
      }
    }
  });

  it("one run whose provider reuses an id in two turns commits two distinct keys, each landing", async () => {
    const { where, again } = await runs();
    expect(again.view.entries.map((e) => e.kind)).toEqual(["user", "assistant", "tool-result", "assistant", "tool-result", "assistant"]);
    expect(again.view.entries[2]!.text).toBe("recorded first new");
    expect(again.view.entries[4]!.text, "the second turn's call is not mistaken for the first's").toBe("recorded second new");
    const keys = lines<{ key: string }>(where.out, "attempts").filter((x) => x.process === "third").map((x) => x.key);
    expect(keys).toHaveLength(2);
    expect(keys[0]).not.toBe(keys[1]);
    expect(lines<{ key: string }>(where.out, "effects").filter((e) => e.process === "third").map((e) => e.key)).toEqual(keys);
  });
});
