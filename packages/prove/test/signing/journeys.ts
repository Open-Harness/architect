// J1's journeys (#1190, CX-journey-signs), run once per test file against the fake world in `world.ts`, with every key prove
// makes through chain-evm's `Keys.generate` caught as it is made and everything printed or logged meanwhile kept. Written by
// J1's checks author; a builder never edits it.
//
// The surface (`s.<name>.signs`, `s.<name>.signer`) is reached through `Signing`, so this compiles before the builder adds it.
import { Effect, type Redacted, References } from "effect";
import { afterAll, beforeAll, expect } from "vitest";
import { Blueprint, expect as check, Via } from "orthograph";
import { Keys } from "@orthograph/chain-evm/device";
import { Journeys } from "../../src/modules/journeys/service.ts";
import type { CallRecord, JourneyRun } from "../../src/modules/journeys/types.ts";
import { claim, claimText, open, Safe, startWorld, type World } from "./world.ts";

/** What CX-journey-signs adds to a cast member, as a script sees them. */
interface Signing {
  readonly signs: { (strings: TemplateStringsArray, ...values: ReadonlyArray<unknown>): never; (message: string | ReadonlyArray<unknown>): never };
  readonly signer: unknown;
}
const as = (actor: unknown) => actor as Signing;
const ada = Blueprint.signedIn;

// ---- the journeys, in the order they run (a run's index is its place here) -------------------------------------------
const aSafe = Blueprint.startingWorld("a safe", { cast: { ada }, makes: (s) => [s.ada.run(open, {})], gives: (s) => ({ safe: s.last.safe, count: 3, big: 30n, thing: { a: 1 } }) });
/** A world that begins from `a safe`: ada signs the claim in `makes`, then claims with `s.last`, and the world gives who it recovered. */
const aClaimedSafe = Blueprint.startingWorld("a claimed safe", {
  from: "a safe", cast: { ada },
  makes: (s) => [as(s.ada).signs`Capxul: claim Safe ${s.world.safe} for ${s.ada.person}`, s.ada.run(claim, { safe: s.world.safe, signature: s.last.signature })],
  gives: (s) => ({ safe: s.world.safe, claimedBy: s.last.by }),
});
/** A world whose sign names a ref the world never gave: the journey must stop on it, never run on a claim of nothing. */
const aClaimOfNothing = Blueprint.startingWorld("a claim of nothing", {
  from: "a safe", cast: { ada }, makes: (s) => [as(s.ada).signs`Capxul: claim Safe ${s.world.nope} for ${s.ada.person}`], gives: (s) => ({ safe: s.world.safe }),
});

const claims0 = Blueprint.journey("ada claims her safe", {
  cast: { ada, bo: ada }, starts: "a safe",
  steps: (s) => [
    s.step("ada signs the claim", as(s.ada).signs`Capxul: claim Safe ${s.world.safe} for ${s.ada.person}`, check((a) => a.signer).toBe(as(s.ada).signer)),
    s.step("the claim names ada", s.ada.run(claim, { safe: s.world.safe, signature: s.last.signature }), check((a) => a.by).toBe(as(s.ada).signer)),
    s.step("ada signs again, with the same key", as(s.ada).signs("hello, Capxul"), check((a) => a.signer).toBe(as(s.ada).signer)),
    s.step("bo signs too", as(s.bo).signs`I am ${s.bo.person}`, check((a) => a.signer).toBe(as(s.bo).signer)),
    s.step("ada signs the claim again, as parts", as(s.ada).signs(["Capxul: claim Safe ", s.world.safe, " for ", s.ada.person]), check((a) => a.signer).toBe(as(s.ada).signer)),
  ],
});
const JOURNEYS = [
  claims0,
  Blueprint.journey("bo signs ada's claim", {
    cast: { ada, bo: ada }, starts: "a safe",
    steps: (s) => [
      s.step("bo signs ada's claim text", as(s.bo).signs`Capxul: claim Safe ${s.world.safe} for ${s.ada.person}`, check((a) => a.signer).toBe(as(s.bo).signer)),
      s.step("the claim names ada", s.ada.run(claim, { safe: s.world.safe, signature: s.last.signature }), check((a) => a.by).toBe(as(s.ada).signer)),
    ],
  }),
  Blueprint.journey("ada signs another text", {
    cast: { ada, bo: ada }, starts: "a safe",
    steps: (s) => [
      s.step("ada signs a claim for bo", as(s.ada).signs`Capxul: claim Safe ${s.world.safe} for ${s.bo.person}`, check((a) => a.signer).toBe(as(s.ada).signer)),
      s.step("the claim names ada", s.ada.run(claim, { safe: s.world.safe, signature: s.last.signature }), check((a) => a.by).toBe(as(s.ada).signer)),
    ],
  }),
  Blueprint.journey("a message with a ref the world never gave", {
    cast: { ada }, starts: "a safe",
    steps: (s) => [s.step("ada signs a claim of nothing", as(s.ada).signs`Capxul: claim Safe ${s.last.nope} for ${s.ada.person}`)],
  }),
  // The first again, as another journey of the same run: the same names are other people, with other keys.
  claims0,
  Blueprint.journey("ada's key in the world is hers in the journey", {
    // bo is here so that a world signing with someone else's key has someone else's key to sign with.
    cast: { ada, bo: ada }, starts: "a claimed safe",
    steps: (s) => [s.step("ada signs once the world has claimed", as(s.ada).signs("hello, Capxul"), check((a) => a.signer).toBe(s.world.claimedBy), check((a) => a.signer).toBe(as(s.ada).signer))],
  }),
  Blueprint.journey("the system has no key", {
    cast: { ada, sys: Blueprint.system },
    steps: (s) => [s.step("the system tries to sign", as(s.sys).signs("hello, Capxul"))],
  }),
  Blueprint.journey("the keeper has no key", {
    cast: { ada, keeper: Blueprint.keeper },
    steps: (s) => [s.step("the keeper tries to sign", as(s.keeper).signs("hello, Capxul"))],
  }),
  Blueprint.journey("a journey on a world that signed nothing", {
    cast: { ada }, starts: "a claim of nothing",
    steps: (s) => [s.step("ada signs once the world has claimed nothing", as(s.ada).signs("hello, Capxul"))],
  }),
  /**
   * The exact text: spaces, a tab, CR LF and a trailing newline kept as written, non-ASCII kept, and each part read as its text (`String`): a
   * number, a bigint and an object; a sign step's check that must fail; and ada signing by her key's way in, with her own key.
   */
  Blueprint.journey("the exact text, and a check that reads it", {
    cast: { ada, bo: ada }, starts: "a safe",
    steps: (s) => [
      s.step("ada signs a text with odd spaces", as(s.ada).signs`  Capxul:\r\n  claim  ${s.world.count}\t${s.world.big} ${s.world.thing} Ünïcødé ✓ ${s.world.safe}  \n`, check((a) => a.signer).toBe(as(s.ada).signer)),
      s.step("ada signs by her key's way in", as(s.ada.via(Via.key)).signs("hello, Capxul"), check((a) => a.signer).toBe(as(s.ada).signer)),
      s.step("a sign step's check that must fail", as(s.ada).signs("hello, Capxul"), check((a) => a.signer).toBe(as(s.bo).signer)),
    ],
  }),
] as const;
export const RUN = { claims: 0, another: 1, otherText: 2, unsaid: 3, again: 4, onClaimed: 5, keyless: 6, keeper: 7, onNothing: 8, exact: 9, repeat: 10 } as const;
/** Each run's journey index: the last is the first journey run again under its own index, as a second `ortho prove` in one process would. */
const INDEX = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0] as const;

/** Every sign step's title: what has no span of its own. */
export const SIGNS = new Set([
  "ada signs the claim", "ada signs again, with the same key", "bo signs too", "ada signs the claim again, as parts", "bo signs ada's claim text",
  "ada signs a claim for bo", "ada signs a claim of nothing", "ada signs once the world has claimed", "the system tries to sign",
  "ada signs once the world has claimed nothing", "ada signs a text with odd spaces", "a sign step's check that must fail",
  "ada signs by her key's way in", "the keeper tries to sign",
]);

const project = {
  root: "", model: { operations: {} },
  operations: new Map<string, unknown>([["safe.open", open], ["safe.claim", claim]]), things: new Map<string, unknown>([["safe", Safe]]),
  journeys: [], startingWorlds: new Map<string, unknown>([["a safe", aSafe], ["a claimed safe", aClaimedSafe], ["a claim of nothing", aClaimOfNothing]]),
} as never;
const facts = { record: () => Effect.succeed(null), journal: () => Effect.succeed([]) } as never;

export const wire = (_: string, v: unknown) => (typeof v === "bigint" ? v.toString() : v);

/** The runs and everything around them, made once per test file: the world, the keys made, what was said. */
export const signing = () => {
  const made: Array<Redacted.Redacted<string>> = [];
  const said: Array<string> = [];
  const undo: Array<() => void> = [];
  const state = { world: undefined as World | undefined, started: 0, runs: [] as ReadonlyArray<JourneyRun>, globals: new Set<string | symbol>() };
  beforeAll(async () => {
    state.started = Date.now();
    state.globals = new Set(Reflect.ownKeys(globalThis));
    const original = Keys.generate;
    (Keys as { generate: typeof Keys.generate }).generate = Effect.tap(original, (secret) => Effect.sync(() => { made.push(secret); }));
    undo.push(() => { (Keys as { generate: typeof Keys.generate }).generate = original; });
    for (const method of ["log", "info", "warn", "error", "debug", "trace"] as const) {
      const was = console[method];
      console[method] = (...args: ReadonlyArray<unknown>) => { said.push(args.map((a) => (typeof a === "string" ? a : JSON.stringify(a, wire))).join(" ")); };
      undo.push(() => { console[method] = was; });
    }
    for (const stream of [process.stdout, process.stderr]) {
      const was = stream.write.bind(stream);
      stream.write = ((chunk: unknown, ...rest: ReadonlyArray<unknown>) => { said.push(String(chunk)); return (was as (...a: ReadonlyArray<unknown>) => boolean)(chunk, ...rest); }) as typeof stream.write;
      undo.push(() => { stream.write = was as typeof stream.write; });
    }
    state.world = await startWorld();
  });
  afterAll(async () => {
    for (const step of undo.splice(0).reverse()) step();
    await state.world?.close();
  });
  // Every log level on, so a key logged at debug or trace is said, and caught.
  const runOf = (journey: unknown, index: number) =>
    Effect.runPromise(Journeys.run(project, state.world!.url, journey as never, index, "world", facts).pipe(Effect.provideService(References.MinimumLogLevel, "All")));
  const ran = async () => {
    if (state.runs.length === 0) {
      const out: Array<JourneyRun> = [];
      for (const [at, journey] of [...JOURNEYS, claims0].entries()) out.push(await runOf(journey, INDEX[at]!));
      state.runs = out;
    }
    return state.runs;
  };
  const world = () => state.world!;
  /** The person id the world gave each name in a run, from the world's own cast. */
  const personsIn = (index: number) => ({ ada: world().castAs.get(`j${index}.ada`), bo: world().castAs.get(`j${index}.bo`) });
  /** The Safe the starting world opened for a run: the one its ada opened. */
  const safeOf = (index: number) => [...world().safes].find(([, owner]) => owner === personsIn(index).ada)?.[0];
  /** What the runs left on `globalThis`: every property it did not have before them. */
  const addedGlobals = () => Reflect.ownKeys(globalThis).filter((k) => !state.globals.has(k)).map((k) => (globalThis as Record<string | symbol, unknown>)[k]);
  return { made, said, ran, world, personsIn, safeOf, addedGlobals, claimTextOf: (index: number, who: "ada" | "bo" = "ada") => claimText(safeOf(index), personsIn(index)[who]), started: () => state.started };
};

/** A step's own call, by its title: the record of what it did. */
export const recordOf = (run: JourneyRun, step: string): CallRecord | undefined => run.calls.find((c) => c.step === step);
/** The answer a sign step recorded, or what is wrong with its record. */
export const answerOf = (run: JourneyRun, step: string) => {
  const record = recordOf(run, step);
  expect(record, `journey "${run.name}" step "${step}": no call recorded for it; calls: ${run.calls.map((c) => `${c.step} (${c.operation} ${c.status})`).join(", ")}`).toBeDefined();
  expect(record!.status, `journey "${run.name}" step "${step}": expected a signature, recorded ${record!.status} ${JSON.stringify(record!.body)}`).toBe(200);
  return record!.body as { readonly message: string; readonly signature: string; readonly signer: string };
};
export const stepOf = (run: JourneyRun, title: string) => run.steps.find((s) => s.title === title);
/** `answer "<got>", expected "<wanted>"`, the failure an expect-equal on an address gives. */
export const addressesIn = (failure: string | undefined) => /^answer "(0x[0-9a-fA-F]{40})", expected "(0x[0-9a-fA-F]{40})"$/.exec(failure ?? "")?.slice(1) ?? [];
