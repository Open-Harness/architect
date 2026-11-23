// Which stand-ins a run's journeys command: a world stands up only those, so a project's other journeys pay for none.
import type { AnyCall, Journey, StartingWorld } from "orthograph";
import { Scripting } from "orthograph/server";

const mountsOf = (call: AnyCall): ReadonlyArray<string> =>
  call.kind === "stand-call" ? [call.mount] : call.kind === "together-call" ? call.calls.flatMap(mountsOf) : [];

/** The mount of each `stand-call` the journeys' steps make (starting worlds do not command stand-ins). */
export const standsUsed = (journeys: ReadonlyArray<Journey>, worlds: Iterable<StartingWorld> = []): ReadonlySet<string> => {
  const found = new Set<string>();
  for (const journey of journeys) for (const step of journey.steps(Scripting.script(journey.cast))) for (const mount of mountsOf(step.call)) found.add(mount);
  for (const world of worlds) for (const call of world.makes(Scripting.script(world.cast))) for (const mount of mountsOf(call)) found.add(mount);
  return found;
};
