// The Worker: a small JSON door the driver script uses. Throwaway.
import { CloudflareCluster } from "@effect/platform-cloudflare";
import { Effect } from "effect";
import * as DurableDeferred from "effect/workflow/DurableDeferred";
import { app, type Env } from "./app.ts";
import { Confirmed, Publish } from "./workflow.ts";
import type { ClusterWorkflow } from "./flow-object.ts";

export { ClusterWorkflow } from "./flow-object.ts";
export { Ledger } from "./ledger.ts";
export { World } from "./world.ts";

const json = (body: unknown, status = 200) => Response.json(body, { status });

const executionId = (run: string) => Effect.runPromise(Publish.executionId({ run, sleep: "timers" }));
const object = async (env: Env, run: string) =>
  env.CLUSTER_WORKFLOW.getByName(CloudflareCluster.encodeName("Publish", await executionId(run))) as unknown as DurableObjectStub<ClusterWorkflow>;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const body = request.method === "POST" ? ((await request.json()) as Record<string, any>) : {};
    const run = (body.run ?? url.searchParams.get("run")) as string;
    const world = env.WORLD.getByName("world");
    await world.now();
    const rt = await app(env);
    const started = performance.now();
    const timed = (value: unknown) => json({ ms: Math.round((performance.now() - started) * 10) / 10, value });
    switch (url.pathname) {
      case "/start":
        return timed(await rt.runPromise(Publish.execute({ run, sleep: body.sleep, crashIn: body.crashIn, settleDelayMs: body.settleDelayMs }, { discard: true })));
      case "/confirm": {
        const token = DurableDeferred.tokenFromExecutionId(Confirmed, { workflow: Publish, executionId: await executionId(run) });
        return timed(await rt.runPromise(DurableDeferred.succeed(Confirmed, { token, value: { proposal: body.proposal } })));
      }
      case "/resume":
        return timed(await rt.runPromise(Publish.resume(await executionId(run))));
      case "/status": {
        const result = await rt.runPromise(Publish.poll(await executionId(run)));
        return json({
          executionId: await executionId(run),
          result: result._tag === "Some" ? result.value : null,
          object: await (await object(env, run)).peek(),
          ledger: await env.LEDGER.getByName("ledger").of(run),
          worldNow: new Date(await world.now()).toISOString(),
        });
      }
      case "/ledger":
        return json(await env.LEDGER.getByName("ledger").of(run));
      case "/evict":
        try {
          await (await object(env, run)).evict();
          return json({ evicted: false });
        } catch (e) {
          return json({ evicted: true, error: String(e) });
        }
      case "/alarm":
        return timed(await (await object(env, run)).alarm());
      case "/advance":
        return timed(await world.advance(body.days * 86_400_000));
      case "/refire":
        return timed(await world.refire(await executionId(run), "cooldown"));
      case "/world":
        return json({ now: new Date(await world.now()).toISOString(), timers: await world.timers() });
      default:
        return json({ error: "no such door" }, 404);
    }
  },
};
