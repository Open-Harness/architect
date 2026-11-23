import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Effect } from "effect";
import { canonical, resolveFrom, type Model, type OperationModel } from "@orthograph/compiler";
import type { JourneyVerdict } from "../types.ts";

const digest = (bytes: string | Uint8Array): string => createHash("sha256").update(bytes).digest("hex");
export const modelHash = (model: Model): string => digest(canonical(model));

export const handlerHash = (root: string, op: OperationModel): string | null | undefined =>
  op.kind === "read" ? null : Effect.runSync(Effect.try(() => {
    const file = op.from.kind === "app"
      ? join(root, "src", op.thing, `${op.verb}.ts`)
      // A plugin's operation on the device is judged by its `world` entry, the code a journey runs (M1.29).
      : fileURLToPath(resolveFrom(resolve(root), `${op.from.package}/src/${op.from.thing}/${op.verb}${op.runs === "client" ? ".world" : ""}.js`));
    return digest(readFileSync(file));
  }).pipe(Effect.orElseSucceed(() => undefined)));

export const handlerHashes = (root: string, model: Model) =>
  Object.fromEntries(Object.values(model.operations).map((op) => [op.name, handlerHash(root, op)]));

type JourneyOf = Model["journeys"][string];
type WorldOf = Model["startingWorlds"][string];
/** A journey, the starting worlds it stands on (oldest first), and every operation the two call. */
export interface Scenario {
  readonly journey: JourneyOf;
  readonly worlds: ReadonlyArray<WorldOf>;
  readonly operationNames: ReadonlySet<string>;
}

export const scenarioOf = (model: Model, journey: JourneyOf): Scenario => {
  const worlds: Array<WorldOf> = [];
  const seen = new Set<string>();
  for (let name = journey.starts; name !== null && !seen.has(name);) {
    seen.add(name);
    const world = model.startingWorlds[name];
    if (!world) break;
    worlds.unshift(world);
    name = world.from;
  }
  const operationNames = new Set([
    ...worlds.flatMap((world) => world.makes.flatMap((call) => call ? [call.operation] : [])),
    ...journey.steps.flatMap((step) => "call" in step ? [step.call.operation] : []),
  ]);
  return { journey, worlds, operationNames };
};

/** The journeys (with their worlds) that exercise an operation; only those named in `judged`, when given. */
const stories = (model: Model, operation: string, judged?: ReadonlyArray<string>) =>
  Object.values(model.journeys ?? {}).flatMap((journey) => {
    const scenario = scenarioOf(model, journey);
    if (judged !== undefined && !judged.includes(journey.file)) return [];
    return scenario.operationNames.has(operation) ? [{ journey, worlds: scenario.worlds }] : [];
  }).sort((a, b) => a.journey.file.localeCompare(b.journey.file));

/**
 * The fingerprint of the journeys that judged an operation. A journey added later that also exercises it is new evidence
 * for the next prove, not a change to this proof, so it stales nothing (D3 #15.3: a new read is minor, `stale none`).
 */
export const storyHash = (model: Model, operation: string, judged?: ReadonlyArray<string>) =>
  digest(canonical(stories(model, operation, judged)));

/** Compare the specific handler and journey definitions this operation's proof used. */
export const evidenceHolds = (
  root: string, model: Model, operation: string, story: string, verdicts: ReadonlyArray<JourneyVerdict>,
): boolean => {
  const op = model.operations[operation];
  if (!op || verdicts.length === 0) return false;
  const handler = handlerHash(root, op);
  if (verdicts.some((v) => v.verdict !== "pass" || v.handlerHash !== handler)) return false;
  // Every journey that judged it must still exist, still exercise it, and be unchanged, with its worlds.
  const judged = [...new Set(verdicts.map((v) => v.journey))].sort((a, b) => a.localeCompare(b));
  const declared = stories(model, operation, judged);
  return declared.length === judged.length && declared.every((s, i) => s.journey.file === judged[i])
    && digest(canonical(declared)) === story;
};
