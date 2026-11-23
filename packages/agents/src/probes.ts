// What a journey may ask of an agent's own actor (GOAL17-check-harness, calls 1 and 5): the descriptors only, importing nothing but `orthograph`.
// Their handlers are `testing.ts`, registered in the world's entry and never reachable from a journey (`harness-01`).
import { Probe } from "orthograph";

/** One stored model step of a submission: Pi stores a row per step, so a repeat would be a second row. */
export interface ModelStep {
  /** The delivering event's id, which `agent.tell` passes to `submit` as `requestId`. */
  readonly requestId: string;
  readonly round: number;
  readonly tools: ReadonlyArray<string>;
  readonly text: string;
}

/** One input the agent was told: what was submitted, for which Assignment, and whether it began a turn or steered one. */
export interface Told {
  readonly requestId: string;
  readonly text: string;
  readonly assignment: string | null;
  readonly how: "submitted" | "steered";
}

/** What the agent committed, in order: the count of model calls that Pi stored, never the count the model was asked. */
export const calls = Probe.read<{ agent: string; requestId?: string }, { steps: ReadonlyArray<ModelStep> }>("probe/agent/calls");
/** What the agent was told, in order, whether or not a model step followed. */
export const told = Probe.read<{ agent: string; requestId?: string }, { inputs: ReadonlyArray<Told> }>("probe/agent/told");
