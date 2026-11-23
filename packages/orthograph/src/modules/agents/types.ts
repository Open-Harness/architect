// Agents (K40 fix 3): `Blueprint.agent` says what an agent of one kind runs with. An agent itself is a thing
// (`@orthograph/agents`' `Agent`), made by any operation allowed to create one and told through the outbox.
import type { Field, Thing } from "#modules/things/types.js";

/**
 * A pool of seats an agent kind runs in (GOAL17-executor-slots): `size` is the field that holds how many, `reserve` the
 * seats kept for a person's message, and `held` the thing whose rows hold the seats.
 */
export interface Slots<T extends Thing = Thing> {
  readonly size: Field;
  readonly reserve: number;
  readonly held: T;
}

export interface AgentSpec {
  /** The model it runs on, as the app's models mount names it. */
  readonly model: string;
  /** Its instructions: what `prompts.compose` makes for its kind. */
  readonly instructions?: unknown;
  /** The environment its tools run in: its sandbox. */
  readonly env?: unknown;
  /** The operations and calls it may use. A tool is an operation's declaration, checked by the real server. */
  readonly tools?: ReadonlyArray<unknown>;
  /** Only an agent that holds a seat has slots. */
  readonly slots?: Slots;
  readonly hooks?: { readonly [name: string]: unknown };
  readonly background?: { readonly after: string; readonly keep: string };
}

export interface Agent extends Omit<AgentSpec, "slots"> {
  readonly kind: "agent";
  readonly slots: Slots | undefined;
}

export interface AgentsApi {
  /** One file in `blueprint/agents/`, its name the file's: `export default Blueprint.agent({ model, slots })`. */
  readonly agent: (spec: AgentSpec) => Agent;
}
