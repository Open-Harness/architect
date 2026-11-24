// One turn of each kind of agent on a real model, through VibeProxy (GOAL17-model-endpoint): Aaron's standing yes covers it, and it is never in CI. It runs only when asked,
// `ORTHO_SMOKE_MODELS=http://localhost:8317/v1 pnpm exec vitest run src/modules/world/agent-smoke.test.ts`, with no key: the endpoint holds the sign-ins.
// What it proves is the real path: Pi Durable's request is one an OpenAI-compatible server answers, and the answer is stored as a model step.
import { resolve } from "node:path";
import { rmSync } from "node:fs";
import { Duration, Effect } from "effect";
import { afterAll, describe, expect, it } from "vitest";
import { Worlds } from "./service.ts";

const endpoint = process.env["ORTHO_SMOKE_MODELS"];
const root = resolve(import.meta.dirname, "../../../../../examples/superagent");
afterAll(() => rmSync(resolve(root, ".ortho/agent-smoke"), { recursive: true, force: true }));

const asJson = (url: string, path: string, init?: RequestInit) =>
  Effect.promise(() => fetch(`${url}${path}`, init).then(async (r) => ({ status: r.status, body: (await r.json().catch(() => null)) as Record<string, any> | null })));
const post = (url: string, path: string, body: unknown, token?: string) =>
  asJson(url, path, { method: "POST", headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
const until = <A>(ask: Effect.Effect<A>, done: (a: A) => boolean) =>
  Effect.gen(function* () {
    for (let i = 0; i < 120; i++) {
      const a = yield* ask;
      if (done(a)) return a;
      yield* Effect.sleep(Duration.millis(1000));
    }
    return yield* ask;
  });

describe.skipIf(endpoint === undefined)("a real model, through VibeProxy", () => {
  it("answers a main agent on deepseek-v4-flash-0731 and an executor on gpt-6.2-sol, each stored as a step", { timeout: 300_000 }, () =>
    Effect.runPromise(Effect.scoped(Effect.gen(function* () {
      // The endpoint and each kind's model reach the Worker as its environment (process secrets, never a file or an argument).
      const world = yield* Worlds.start({
        root, port: 0, name: "agent-smoke",
        secretEnv: { MODELS_BASE_URL: endpoint!, MODEL_MAIN: "deepseek-v4-flash-0731", MODEL_EXECUTOR: "gpt-6.2-sol" },
      });
      const system = ((yield* post(world.url, "/_world/credential", { system: true })).body as { token: string }).token;
      const results: Array<readonly [string, string, string]> = [];
      for (const [kind, about] of [["main", "superagent/sag_0000000000000001"], ["executor", "ticket/tkt_0000000000000001"]] as const) {
        const agent = (yield* post(world.url, "/agent/open", { kind, about }, system)).body!["agent"] as string;
        yield* post(world.url, "/agent/tell", { agent, requestId: `evt_${kind}`, input: "Reply with the single word: ready.", opens: false }, system);
        yield* until(asJson(world.url, `/_world/facts/record?table=agent&id=${agent}`), (r) => r.body?.["state"] === "idle");
        const steps = (yield* asJson(world.url, `/_world/probe/agent/calls?agent=${agent}`)).body?.["steps"] as Array<{ text: string }>;
        results.push([kind, String(steps.length), (steps[0]?.text ?? "").trim().slice(0, 40)]);
      }
      // One step each. The words are the model's, so they are not judged, but the executor's model answers in text: a reply with none from it is a wiring fault.
      expect(results.map(([kind, count]) => [kind, count])).toEqual([["main", "1"], ["executor", "1"]]);
      expect(results.find(([kind]) => kind === "executor")![2].length).toBeGreaterThan(0);
    }))));
});
