// The agent's resident: one Pi Durable conversation in the agent's own actor (K40 fix 3, Pi Durable's unit is a conversation that lives for years). An input told to the
// agent is submitted to it as a turn, steering the one that is running; when the turns end, the agent goes idle and says so. Pure types: no Pi, no socket.
import type { Committed } from "@orthograph/language-effect";

/** What the host's `Actor` gives a resident, beside the Durable Object itself (its `ctx` and `env`). */
export interface ActorHost {
  readonly ctx: {
    readonly storage: { readonly setAlarm: (at: number) => Promise<void>; readonly deleteAlarm: () => Promise<void> };
    readonly waitUntil: (work: Promise<unknown>) => void;
    readonly blockConcurrencyWhile: <A>(work: () => Promise<A>) => Promise<A>;
  };
  readonly env: Readonly<Record<string, unknown>>;
  /** The instance's row, its state and its version, or none. */
  read(): { readonly row: Readonly<Record<string, unknown>>; readonly state: string | null; readonly version: number } | null;
  /** The actor's own all-or-nothing write, with its version guard. */
  write(writes: ReadonlyArray<{ readonly kind: "update"; readonly version: number; readonly changes: Readonly<Record<string, unknown>>; readonly state: string | null }>, entries: ReadonlyArray<JournalEntry>): Committed;
}

/** A journal entry in wire form: the event's fields already JSON text. */
export interface JournalEntry {
  readonly trace: string;
  readonly operation: string;
  readonly move: string;
  readonly subject: string;
  readonly event: string;
  readonly fields: string;
}

/** Where the model is and what each kind of agent runs on, as the environment says (GOAL17-model-endpoint): never written into a handler. */
export interface ModelConfig {
  /** The OpenAI-compatible base url: VibeProxy for a real run, the scripted stand-in in a world. */
  readonly baseUrl: string;
  /** The model's name for an agent kind (`main`, `executor`). */
  readonly modelFor: (kind: string) => string;
  /** A key, when the endpoint needs one; never logged. */
  readonly apiKey: string | undefined;
}
