// The workflow execution object: the package's own program (`makeClusterWorkflowProgram`, made for frameworks that build
// their own Durable Object class), with two spike additions: `evict`, which aborts the object, and `peek`, which reads
// its tables. Exported as `ClusterWorkflow`, the name the engine resolves. Throwaway.
import { DurableObject } from "cloudflare:workers";
import { makeClusterWorkflowProgram, type ClusterWorkflowProgram } from "@effect/platform-cloudflare/CloudflareDurableObjectPrograms";
import { Effect } from "effect";
import { app, live, type Env } from "./app.ts";

const refresh = (env: Env) => env.WORLD.getByName("world").now();

export class ClusterWorkflow extends DurableObject<Env> {
  #program!: ClusterWorkflowProgram;
  readonly #born = Date.now();

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    void ctx.blockConcurrencyWhile(async () => {
      await refresh(env);
      await app(env);
      this.#program = await Effect.runPromise(makeClusterWorkflowProgram(ctx));
      const row = ctx.storage.sql.exec<{ execution_id: string }>("SELECT execution_id FROM workflow_execution").toArray()[0];
      if (row !== undefined) live.set(row.execution_id, ctx);
    });
  }

  async run(payload: string, options: Parameters<ClusterWorkflowProgram["run"]>[1]) {
    await refresh(this.env);
    const done = Effect.runPromise(this.#program.run(payload, options));
    const row = this.ctx.storage.sql.exec<{ execution_id: string }>("SELECT execution_id FROM workflow_execution").toArray()[0];
    if (row !== undefined) live.set(row.execution_id, this.ctx);
    return done;
  }
  async poll() { await refresh(this.env); return Effect.runPromise(this.#program.poll()); }
  async resume(mode?: "automatic" | "explicit") { await refresh(this.env); return Effect.runPromise(this.#program.resume(mode)); }
  async interrupt() { await refresh(this.env); return Effect.runPromise(this.#program.interrupt()); }
  async interruptUnsafe() { await refresh(this.env); return Effect.runPromise(this.#program.interruptUnsafe()); }
  async deferredDone(name: string, exit: string) { await refresh(this.env); return Effect.runPromise(this.#program.deferredDone(name, exit)); }
  async scheduleClock(name: string, deferredName: string, wakeUp: number) {
    await refresh(this.env);
    return Effect.runPromise(this.#program.scheduleClock(name, deferredName, wakeUp));
  }
  override async alarm() { await refresh(this.env); return Effect.runPromise(this.#program.alarm()); }

  /** Evict: throw the object away, RAM and all. The next contact builds a new one from SQLite. */
  evict(): void {
    this.ctx.abort("spike: evicted");
  }

  /** What the object has stored, and which instance answered (its birth time tells a new instance from the old). */
  async peek() {
    const sql = this.ctx.storage.sql;
    return {
      born: this.#born,
      execution: sql.exec("SELECT execution_id, result, resume_pending FROM workflow_execution").toArray()[0],
      activities: sql.exec<{ key: string }>("SELECT key FROM workflow_activities ORDER BY rowid").toArray().map((r) => r.key),
      deferreds: sql.exec<{ name: string }>("SELECT name FROM workflow_deferreds ORDER BY rowid").toArray().map((r) => r.name),
      deferredExits: Object.fromEntries(sql.exec<{ name: string; exit: string }>("SELECT name, exit FROM workflow_deferreds").toArray().map((r) => [r.name, r.exit])),
      clocks: sql.exec("SELECT name, wake_up, fired FROM workflow_clocks").toArray(),
      alarm: await this.ctx.storage.getAlarm(),
    };
  }
}
