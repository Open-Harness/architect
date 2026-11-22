// What the agents feature's checks share: acme with the agents fixture laid over it, and the journeys it holds, each
// with its file and its step count written out here (never read back from the run, nor from the journey file).
// The proving helpers are M8's (`passedWhole`, `failedAt`, `plant`, `once`): the same prove, the same un-gameable reading.
import { cpSync, rmSync } from "node:fs";
import { join } from "node:path";
import { acme, copyOf, failedAt, generated, nothingRunning, once, plant, prove, repo, type Proved } from "../../m8/support.ts";

export { generated, nothingRunning, once, prove };
export { failedAt, passedWhole } from "../../m8/support.ts";

export const fixtures = join(repo, "e2e/fixtures/agents");

/** examples/acme copied, with `e2e/fixtures/agents/<fixture>` laid over it: the mount, the agents, the worlds and the journeys. */
export const shop = (fixture: string) => {
  const copy = copyOf(acme);
  cpSync(join(fixtures, fixture), copy.root, { recursive: true });
  return copy;
};

export interface Journey {
  readonly file: string;
  readonly name: string;
  readonly steps: number;
}

/** The fixture's twelve journeys. The step counts are literals: a journey that gained or lost a step is a different journey. */
export const JOURNEYS = {
  starts: { file: "a-run-starts-and-reads-back", name: "a run starts and reads back", steps: 7 },
  steers: { file: "steering-reaches-the-transcript", name: "steering reaches the transcript", steps: 7 },
  cancels: { file: "cancelling-stops-the-tools", name: "cancelling stops the tools", steps: 9 },
  budget: { file: "a-spent-budget-fails-the-run", name: "a spent budget fails the run", steps: 9 },
  evictTool: { file: "eviction-in-the-tool-phase-makes-no-extra-request", name: "eviction in the tool phase makes no extra request", steps: 9 },
  evictModel: { file: "eviction-with-a-reply-held-repeats-one-request", name: "eviction with a reply held repeats one request", steps: 8 },
  starter: { file: "only-the-starter-steers-or-cancels", name: "only the starter steers or cancels", steps: 6 },
  person: { file: "an-agent-is-refused-what-its-person-is-refused", name: "an agent is refused what its person is refused", steps: 8 },
  gate: { file: "the-support-agent-spends-for-bob", name: "the support agent spends for bob", steps: 7 },
  key: { file: "the-same-key-starts-one-run", name: "the same key starts one run", steps: 8 },
  closed: { file: "the-loop-closes-a-run-with-closed-values", name: "the loop closes a run with closed values", steps: 29 },
  pool: { file: "a-full-pool-refuses", name: "a full pool refuses", steps: 8 },
} as const satisfies Record<string, Journey>;

/** One planted wrong copy of a journey: its tag, the journey, the step that must fail, and the text swaps that plant it. */
export type Plant = readonly [tag: string, journey: Journey, step: string, swaps: ReadonlyArray<readonly [string, string]>];

/**
 * Plant every case in a copy of the fixture, take all twelve true journeys out of that copy (so every ✘ in the run is a planted
 * one, and the run is only as long as its plants), prove it once, and return the prove with each planted journey's name and the step it must fail at.
 */
export const provePlanted = (root: string, cases: ReadonlyArray<Plant>) => {
  const named = cases.map(([tag, journey, step, swaps]) => ({ name: plant(root, journey.file, tag, journey.name, swaps), journey, step }));
  for (const { file } of Object.values(JOURNEYS)) rmSync(join(root, "journeys", `${file}.ts`));
  const run: Proved = prove(generated(root));
  return { run, named };
};

/** Every planted journey of `named` failed at exactly its own step, the others passing. */
export const allFailedAtTheirStep = (run: Proved, named: ReadonlyArray<{ readonly name: string; readonly journey: Journey; readonly step: string }>) => {
  for (const { name, journey, step } of named) failedAt(run, name, journey.steps, step);
};
