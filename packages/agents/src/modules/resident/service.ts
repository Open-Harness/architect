// The agents' actor: the host's `Actor` with a Pi Durable conversation resident in it, one conversation per agent for good, and runs as the turns inside it.
// `agent.tell` records what it was told (the actor's own commit); the actor then submits it to Pi, steering the turn that is running, and when no turn is left
// it goes idle and says so (`AgentIdled`). A world that dies mid-turn finds its conversation as it was: Pi resumes it from its alarm.
import { BACKGROUND_CONTEXT } from "@earendil-works/chord/context";
import { createRegistry, Harness } from "@earendil-works/pi-durable";
import { openDurableObjectSqliteStorage } from "@earendil-works/pi-durable/storage/sqlite/cloudflare";
import { Clock, Effect } from "effect";
import type { ActorHost, JournalEntry } from "./types.ts";
import { configOf } from "./internal/config.ts";
import { modelsFor, PROVIDER } from "./internal/models.ts";
import { stepsOf, type Step } from "./internal/steps.ts";

const context = BACKGROUND_CONTEXT;
const now = () => Effect.runSync(Clock.currentTimeMillis);

/** The agent's own journal entry for going idle: `AgentIdled { agent, about, assignment }` (the Assignment it was working for, when it had one). */
const idled = (row: Readonly<Record<string, unknown>>): JournalEntry => ({
  trace: "", operation: "agent.idled", move: "idled", subject: String(row["id"]), event: "AgentIdled",
  fields: JSON.stringify({ agent: row["id"], about: row["about"], ...(typeof row["current"] === "string" ? { assignment: row["current"] } : {}) }),
});

/**
 * Make the agents' actor out of the host's `Actor` class. The base is the host's own: it is handed in by the generated Worker, so this package depends on no host.
 */
export const agentActor = (Base: any) =>
  class AgentActor extends Base {
    #harness: Promise<Harness> | undefined;
    #inflight = 0;
    readonly #timers = new Map<number, { readonly at: number; readonly callback: () => void }>();
    #next = 0;

    get #host(): ActorHost { return this as unknown as ActorHost; }

    /** The agent was told something: the conversation takes it as a turn, or steers the one running. */
    protected committed(entries: ReadonlyArray<JournalEntry>): void {
      super.committed(entries);
      if (entries.some((e) => e.move === "tell")) this.#host.ctx.waitUntil(this.#turn());
    }

    #open(): Promise<Harness> {
      return (this.#harness ??= this.#host.ctx.blockConcurrencyWhile(async () => {
        const held = this.#host.read();
        const config = configOf(this.#host.env);
        if (held === null || config === undefined) throw new Error("this agent has no row, or the world names no models endpoint (ORTHO_STAND_MODELS or MODELS_BASE_URL)");
        const who = { agent: String(held.row["id"]), about: String(held.row["about"]) };
        return Harness.open(await openDurableObjectSqliteStorage((this.#host.ctx as unknown as { storage: never }).storage), {
          registry: createRegistry(),
          models: modelsFor(config, [String(held.row["kind"])], who),
          now,
          setTimer: (callback: () => void, delay: number, { background }: { background?: boolean }) => {
            if (background) return undefined;
            const id = ++this.#next;
            const at = now() + delay;
            this.#timers.set(id, { at, callback });
            this.#host.ctx.waitUntil(this.#host.ctx.storage.setAlarm(at));
            return () => { this.#timers.delete(id); };
          },
          // A fault of the conversation is told in the world's log as its kind and message, never its content.
          onReport: ({ kind, error }: { kind: string; error?: unknown }) => console.error("Pi report", kind, String((error as Error | undefined)?.message ?? error)),
          onWake: (wake: { readonly at?: number }) => { if (wake.at !== undefined) this.#host.ctx.waitUntil(this.#host.ctx.storage.setAlarm(wake.at)); },
        }, context);
      }));
    }

    async #turn(): Promise<void> {
      const harness = await this.#open();
      const row = this.#host.read()!.row;
      // An actor keeps a list field as it travels: JSON text, or the list itself.
      const kept = row["told"];
      const told = (typeof kept === "string" ? JSON.parse(kept) : kept ?? []) as ReadonlyArray<{ readonly requestId: string; readonly text: string }>;
      const last = told.at(-1);
      if (last === undefined) return;
      const root = await harness.root(context, { agent: { model: { provider: PROVIDER, modelId: configOf(this.#host.env)!.modelFor(String(row["kind"])) } } });
      this.#inflight++;
      const submission = await root.submit({ type: "input", content: last.text, requestId: last.requestId, whenBusy: "steer" }, context);
      const settled = await submission.wait(context) as { readonly status: string; readonly reason?: string; readonly detail?: string };
      // A turn that was not answered says why in the world's log: its status and reason, never what was said.
      if (settled.status !== "done") console.error("Pi turn", settled.status, settled.reason ?? "", settled.detail ?? "");
      this.#inflight--;
      if (this.#inflight === 0) this.#idle();
    }

    /** No turn is left: the agent is idle, in its own commit, and it says so. A write that lost its version runs again from the row as it is now. */
    #idle(): void {
      for (let tries = 0; tries < 5; tries++) {
        const held = this.#host.read();
        if (held === null || held.state !== "working") return;
        const outcome = this.#host.write([{ kind: "update", version: held.version, changes: { current: null }, state: "idle" }], [idled(held.row)]);
        if (outcome === "committed") return;
      }
    }

    /** Pi's timers fall due on the actor's alarm: the due ones run, and the conversation goes on from where it stopped. */
    async alarm(): Promise<void> {
      const harness = await this.#open();
      const due = [...this.#timers].filter(([, t]) => t.at <= now());
      for (const [id, timer] of due) { this.#timers.delete(id); timer.callback(); }
      harness.resume();
      const wake = harness.wake();
      if (wake.at !== undefined) await this.#host.ctx.storage.setAlarm(wake.at);
    }

    /** The model steps the conversation has committed, in order: what the `calls` probe reads. */
    async steps(): Promise<ReadonlyArray<Step>> {
      const harness = await this.#open();
      const root = await harness.root(context);
      return stepsOf((await root.entries({}, 500, undefined, context)).items);
    }
  };
