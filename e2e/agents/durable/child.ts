// The process a check kills and restarts: one run of the agents seam on Node, on Pi's faux provider, as `support.ts`
// configures it. Check-owned (the builder never edits it). It is an entry file: it reads argv, the clock and the process,
// and prints; the seam under test does none of that. Its last stdout line is `RESULT <json>`.
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createModels, createProvider } from "@earendil-works/pi-ai/models";
import { createAssistantMessageEventStream } from "@earendil-works/pi-ai/utils/event-stream";
import { fauxAssistantMessage, fauxProvider, fauxToolCall } from "@earendil-works/pi-ai/providers/faux";
import { Busy, BusyLive, Timers } from "@orthograph/language-effect";
import { Clock, Duration, Effect, Layer } from "effect";
import { Agent, Host, type AgentTool } from "../../../packages/agents/src/index.ts";
import type { Config } from "./support.ts";

const cfg = JSON.parse(readFileSync(process.argv[2]!, "utf8")) as Config;
const FIXED = 1_000_000_000_000; // the provider's own message timestamps are a literal, so they never read the clock
const log = (file: string, line: object) => appendFileSync(join(cfg.out, `${file}.jsonl`), `${JSON.stringify({ process: cfg.process, ...line })}\n`);
const stored = (file: string): ReadonlyArray<{ key: string }> => {
  const path = join(cfg.out, `${file}.jsonl`);
  return existsSync(path) ? readFileSync(path, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
};
const ms = () => Date.now() + cfg.offsetMs;
let busy: { readonly count: Effect.Effect<number> } | undefined;
const counted = () => (busy === undefined ? -1 : Effect.runSync(busy.count));

// Time: a clock `offsetMs` ahead of the platform's, and timers that fire on it. Every call is logged for the check.
const base = Effect.runSync(Clock.clockWith(Effect.succeed));
const clock: Clock.Clock = {
  currentTimeMillisUnsafe: ms, currentTimeMillis: Effect.sync(ms),
  currentTimeNanosUnsafe: () => BigInt(ms()) * 1_000_000n, currentTimeNanos: Effect.sync(() => BigInt(ms()) * 1_000_000n),
  monotonicTimeNanosUnsafe: base.monotonicTimeNanosUnsafe, monotonicTimeNanos: base.monotonicTimeNanos, sleep: base.sleep,
};
let timerId = 0;
const timers = Layer.succeed(Timers, Timers.of({
  at: (at, owner, name, work) => Effect.sync(() => {
    log("timers", { kind: "at", at, owner, name, now: ms() });
    setTimeout(() => Effect.runFork(Effect.ignore(work)), Math.max(0, at - ms()));
    return ++timerId;
  }),
  sleep: (owner, span) => Effect.suspend(() => {
    const wait = Duration.toMillis(Duration.fromInputUnsafe(span));
    log("timers", { kind: "sleep", owner, wait, now: ms() });
    return Effect.promise(() => new Promise<void>((done) => setTimeout(done, wait)));
  }),
  within: (owner, span, wait) => Effect.suspend(() => {
    log("timers", { kind: "within", owner, now: ms() });
    return Effect.timeoutOption(wait, span);
  }),
  due: () => Effect.succeed(undefined), fire: () => Effect.succeed([]), pending: Effect.succeed([]),
}));

// The faux provider, scripted by the step the request is for (tool results seen so far), so a restarted process
// answers each step the same way. Every request is logged before it is answered: that log is the request count.
const faux = fauxProvider();
const call = (note: string) => fauxAssistantMessage([fauxToolCall("record", { note }, { id: cfg.callId })], { stopReason: "toolUse", timestamp: FIXED });
const script = cfg.script === "two-tools-same-id" ? [call("first"), call("second")] : [call("first")];
const answer = fauxAssistantMessage("All recorded.", { timestamp: FIXED });
faux.setResponses(Array.from({ length: 12 }, () => (context) => {
  const step = context.messages.filter((m) => m.role === "toolResult").length;
  log("requests", { step, busy: counted(), at: ms() });
  if (cfg.hold === "model" && step === 0) return new Promise<never>(() => {}); // the reply never comes: the check kills us
  return script[step] ?? answer;
}));
// Usage per step, literals: the faux provider estimates its own (and reports no input or cache reads), so a wrapper
// stamps these on every message of the step. Every field differs, so a seam that drops or swaps one is seen.
const USAGE = [
  { input: 11, output: 7, cacheRead: 3, cacheWrite: 5 },
  { input: 13, output: 17, cacheRead: 19, cacheWrite: 23 },
  { input: 29, output: 31, cacheRead: 37, cacheWrite: 41 },
] as const;
const stamp = (event: any, step: number) => {
  const usage = { ...USAGE[Math.min(step, 2)]!, totalTokens: 0, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } };
  const out = { ...event };
  for (const key of ["message", "partial", "error"]) if (out[key]?.usage !== undefined) out[key] = { ...out[key], usage };
  return out;
};
const streamed = (model: any, context: any, options: any) => {
  const step = context.messages.filter((m: any) => m.role === "toolResult").length;
  const inner = faux.provider.streamSimple(model, context, options);
  const outer = createAssistantMessageEventStream();
  void (async () => { for await (const event of inner) outer.push(stamp(event, step)); })();
  return outer;
};
const models = createModels();
models.setProvider(createProvider({ id: faux.provider.id, auth: faux.provider.auth, models: faux.models, api: { stream: streamed, streamSimple: streamed } } as never));

const record: AgentTool = {
  name: "record", description: "Record a note once.", idempotent: "request",
  parameters: { type: "object", properties: { note: { type: "string" } }, required: ["note"], additionalProperties: false },
  execute: (args, tool) => Effect.gen(function* () {
    log("attempts", { key: tool.requestKey, callId: tool.callId, busy: counted() });
    if (cfg.hold === "tool") yield* Effect.never; // in flight: the check kills us here
    // What an idempotent endpoint does with a request key: the first one lands, a repeat changes nothing.
    const seen = stored("effects").some((e) => e.key === tool.requestKey);
    if (!seen) log("effects", { key: tool.requestKey, note: (args as { note: string }).note });
    return `recorded ${(args as { note: string }).note} ${seen ? "duplicate" : "new"}`;
  }),
};

const program = Effect.gen(function* () {
  busy = yield* Busy;
  const agents = yield* Agent;
  if (cfg.command === "view") return { view: yield* agents.view(cfg.run) };
  const run = yield* agents.open({ run: cfg.run, model: { provider: faux.getModel().provider, modelId: faux.getModel().id }, tools: [record] });
  if (cfg.submit) yield* run.submit({ key: "start-1", content: "Record a note, then say so." });
  const settled = yield* run.wait;
  return { settled, view: yield* run.view };
});

const main = Effect.scoped(program).pipe(
  Effect.provide(Layer.provideMerge(Host.node({ root: cfg.root, models }), Layer.mergeAll(timers, BusyLive))),
  Effect.provideService(Clock.Clock, clock),
);
Effect.runPromise(main).then(
  (result) => { process.stdout.write(`RESULT ${JSON.stringify(result)}\n`); process.exit(0); },
  (error) => { process.stderr.write(`child failed: ${error instanceof Error ? (error.stack ?? error.message) : JSON.stringify(error)}\n`); process.exit(1); },
);
