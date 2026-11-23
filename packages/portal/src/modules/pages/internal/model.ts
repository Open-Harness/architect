// What the pages read of the blueprint, derived once: refusal codes, events, journeys, starting worlds, environments and mounts, all from the wire.
import type { BlueprintWire, FieldWire, ModelWire, OperationWire, ThingWire } from "#modules/wire/types.js";

export type JourneyRow = NonNullable<ModelWire["journeys"]>[string];
export type WorldRow = NonNullable<ModelWire["startingWorlds"]>[string];
export type EnvRow = NonNullable<ModelWire["environments"]>[string];
export type MountRow = NonNullable<ModelWire["mounts"]>[string];

export const refusalsOf = (b: BlueprintWire): Readonly<Record<string, string>> => b.model.refusals ?? {};
export const journeysOf = (b: BlueprintWire): ReadonlyArray<JourneyRow> => Object.values(b.model.journeys ?? {});
export const worldsOf = (b: BlueprintWire): ReadonlyArray<WorldRow> => Object.values(b.model.startingWorlds ?? {});
export const environmentsOf = (b: BlueprintWire): ReadonlyArray<EnvRow> => Object.values(b.model.environments ?? {});
export const mountsOf = (b: BlueprintWire): ReadonlyArray<readonly [string, MountRow]> => Object.entries(b.model.mounts ?? {});

/** The events a thing declares, with each one's fields. */
export const eventsOf = (thing: ThingWire): ReadonlyArray<readonly [string, Readonly<Record<string, FieldWire>>]> => Object.entries(thing.events ?? {});

/** The operations a journey calls in the steps that run (a skipped step runs nothing). */
export const callsOf = (j: JourneyRow): ReadonlyArray<string> => [...new Set(j.steps.flatMap((s) => ("call" in s ? [s.call.operation] : [])))];
export const journeysCalling = (b: BlueprintWire, operation: string): ReadonlyArray<JourneyRow> => journeysOf(b).filter((j) => callsOf(j).includes(operation));

/** The refusals the model declares for an operation, each with its code. */
export const refusalsFor = (b: BlueprintWire, op: OperationWire): ReadonlyArray<readonly [string, string]> =>
  op.refusals.map((name) => [name, refusalsOf(b)[name] ?? ""] as const);
