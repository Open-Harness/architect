// One turn of an agent's Pi Durable conversation, in a real world on the scripted model stand-in (GOAL17-slice9-build, call 16): `agent.tell` records the input, the actor submits it to Pi,
// the model answers as scripted, the conversation commits one step and the agent goes idle. No outbox: `agent.tell` is called directly, as a hop would.
import { Duration, Effect } from "effect";
import { afterAll, describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { rmSync } from "node:fs";
import { standProcess } from "./internal/stands.ts";
import { Worlds } from "./service.ts";

// The example itself, with a state folder of this test's own (`.ortho/agent-turn`, removed after): its plugins are workspace packages, which a copy would load twice.
const root = resolve(import.meta.dirname, "../../../../../examples/superagent");
afterAll(() => rmSync(resolve(root, ".ortho/agent-turn"), { recursive: true, force: true }));

const asJson = (url: string, path: string, init?: RequestInit) =>
  Effect.promise(() => fetch(`${url}${path}`, init).then(async (r) => ({ status: r.status, body: (await r.json().catch(() => null)) as Record<string, any> | null })));
const post = (url: string, path: string, body: unknown, token?: string) =>
  asJson(url, path, { method: "POST", headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });

/** Ask until the answer is the one wanted, for at most a minute of real time. */
const until = <A>(ask: Effect.Effect<A>, done: (a: A) => boolean) =>
  Effect.gen(function* () {
    for (let i = 0; i < 120; i++) {
      const a = yield* ask;
      if (done(a)) return a;
      yield* Effect.sleep(Duration.millis(500));
    }
    return yield* ask;
  });

describe("an agent's turn", () => {
  it("is told, runs on the scripted model through Pi Durable, commits one step and goes idle", { timeout: 300_000 }, () =>
    Effect.runPromise(Effect.scoped(Effect.gen(function* () {
      // The `models` mount's stand-in, as prove starts it for a world: the scripted model's own process (`@orthograph/openai`'s entry).
      const openai = resolve(root, "../../packages/openai");
      const world = yield* Worlds.start({ root, port: 0, name: "agent-turn", stands: { models: standProcess("models", resolve(openai, "src/stand-in/main.ts"), openai) } });
      const stand = world.stands["models"]!.url;
      const system = ((yield* post(world.url, "/_world/credential", { system: true })).body as { token: string }).token;

      const opened = yield* post(world.url, "/agent/open", { kind: "executor", about: "ticket/tkt_0000000000000001" }, system);
      expect(opened.status).toBe(200);
      const agent = opened.body!["agent"] as string;

      yield* post(stand, "/_stand/script", { for: { kind: "executor" }, turns: [{ say: "Added both." }] });
      const told = yield* post(world.url, "/agent/tell", { agent, requestId: "evt_1", input: "fix the flaky login test", assignment: "asg_0000000000000001", opens: true }, system);
      expect(told.status).toBe(200);

      const state = yield* until(asJson(world.url, `/_world/facts/record?table=agent&id=${agent}`), (r) => r.body?.["state"] === "idle");
      expect(state.body?.["state"]).toBe("idle");
      expect(state.body?.["current"]).toBeNull();

      const calls = yield* asJson(world.url, `/_world/probe/agent/calls?agent=${agent}`);
      expect(calls.body?.["steps"]).toMatchObject([{ round: 1, tools: [], text: "Added both." }]);
      const heard = yield* asJson(world.url, `/_world/probe/agent/told?agent=${agent}`);
      expect((heard.body?.["inputs"] as Array<{ text: string; how: string }>).map((i) => [i.text, i.how])).toEqual([["fix the flaky login test", "submitted"]]);

      // The model was asked once, as an executor about its ticket, and every scripted turn was used.
      const seen = yield* post(stand, "/_stand/seen", {});
      expect(seen.body?.["requests"]).toMatchObject([{ n: 1, model: "executor", about: "ticket/tkt_0000000000000001", answered: "scripted" }]);
      expect((yield* post(stand, "/_stand/done", {})).status).toBe(200);
    }))));
});
