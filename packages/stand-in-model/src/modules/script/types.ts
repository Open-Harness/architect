// The model stand-in's script: what it answers, in order, to whom, and what it has been asked. Pure: no process, no clock, no socket.
export type Json = unknown;

/** Where a turn stays open until a release: before anything is written, or after the first chunk of the reply. */
export type Hold = "before-reply" | "after-first-chunk";

export interface ModelTurn {
  /** Assistant text. */
  readonly say?: string;
  /** Tool calls, in order; each tool must be among those the request offered. An argument `"$eval"` or `"$ticket"` is filled from the request. */
  readonly call?: ReadonlyArray<{ readonly tool: string; readonly args: Json }>;
  readonly hold?: Hold;
  /** A status the model answers with, or the connection dropped. */
  readonly fail?: { readonly status: number } | "reset";
}

/** Whose requests a script answers: the kind comes from the request's `model` name; about and agent from its headers. */
export interface Who {
  readonly kind?: "main" | "executor";
  readonly about?: string;
  readonly agent?: string;
}

/** What one request carried, as the stand-in reads it. */
export interface Incoming {
  readonly model: string;
  readonly tools: ReadonlyArray<string>;
  /** Every message's text, joined: what `containing` searches. */
  readonly text: string;
  readonly about?: string;
  readonly agent?: string;
}

/** One request the model was asked: counted whether it was answered, held, cut or refused. */
export interface Seen extends Incoming {
  readonly n: number;
  readonly answered: "scripted" | "no-script" | "tool-not-offered" | "failed";
}

export interface Script {
  readonly id: string;
  readonly for: Who;
  readonly turns: ReadonlyArray<ModelTurn>;
  readonly used: number;
}

export interface ScriptState {
  readonly scripts: ReadonlyArray<Script>;
  readonly seen: ReadonlyArray<Seen>;
}

/** What a request is given: a turn, or the reason there is none. */
export type Taken =
  | { readonly kind: "turn"; readonly n: number; readonly turn: ModelTurn }
  | { readonly kind: "no-script"; readonly n: number }
  | { readonly kind: "tool-not-offered"; readonly n: number; readonly tool: string };

/** The reply's chunks, as `data:` lines: the first (with the role) and the rest, so a hold can fall between them. */
export interface Chunks {
  readonly first: string;
  readonly rest: string;
}

export interface ScriptApi {
  readonly empty: ScriptState;
  /** One more script. Its id is `scr_<n>`. */
  readonly add: (state: ScriptState, spec: { readonly for: Who; readonly turns: ReadonlyArray<ModelTurn> }) => readonly [ScriptState, string];
  /** The turn for this request: the first script it matches with a turn left. Every request is counted in `seen`, whatever it gets. */
  readonly take: (state: ScriptState, incoming: Incoming) => readonly [ScriptState, Taken];
  /** A request that is counted and given no turn (a failure the stand-in was told to make): its number. */
  readonly record: (state: ScriptState, incoming: Incoming, answered: Seen["answered"]) => readonly [ScriptState, number];
  /** The kind a request's `model` name says: the name that holds `main` or `executor`. */
  readonly kindOf: (model: string) => "main" | "executor" | undefined;
  /** The turns no request has used yet. */
  readonly unused: (state: ScriptState) => ReadonlyArray<ModelTurn>;
  /** The requests asked after `since` (their numbers start at 1) whose text holds `containing`. */
  readonly asked: (state: ScriptState, query: { readonly containing?: string; readonly since?: number; readonly nth?: number }) => ReadonlyArray<Seen>;
  /** The reply as the OpenAI stream chunks Pi reads: a role chunk with text or the tool calls, a finish reason, `[DONE]`. */
  readonly chunks: (turn: ModelTurn, incoming: Incoming, id: string) => Chunks;
}
