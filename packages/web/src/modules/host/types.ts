// The browser host (K29 section 2, design/decisions/WEB-host-seam.md): what a page gives every generated piece.
import type { Layer } from "effect";
import type { Action, ActionHost, ActionOptions, ApprovalRequest } from "orthograph/actions";

/** Who pressed: the person at the page, or an agent through UI SDK's bridge. Sent as `x-ortho-source`, for the record and never as a guard. */
export type Caller = "person" | "agent";

/** A no-write refusal as a page shows it: the declared name and code, and the sentence the world gave. */
export interface Refusal {
  readonly name: string;
  /** The declared code (`HN-001`), or empty for a failure that is not a declared refusal. */
  readonly code: string;
  readonly message: string;
  /** False when nothing says whether the world wrote: the next press then sends the same request key. */
  readonly known: boolean;
}

/** How a call ended, as a value: the answer, or the refusal. */
export type Outcome<Answer> = { readonly ok: true; readonly answer: Answer } | { readonly ok: false; readonly refusal: Refusal };

/** One generated `options(host)`: the action's fields, its `run` the SDK's call made through the host. */
export type ActionFactory<Args = any, Answer = any> = (host: ActionHost<any>) => ActionOptions<Args, Answer>;

/** What UI SDK's `dispatch` hands a callback, plus what the piece adds: `settle` hands the call back and `requestKey` is the form's key. */
export interface SendDetails<Answer> {
  readonly reason: string;
  readonly source: string;
  readonly requestKey?: string | undefined;
  readonly settle: (sent: Promise<Outcome<Answer>>) => void;
}

/** The callback every piece's root takes as `onSend`: the payload, as the form wrote it, and the details. */
export type SendCallback<Answer = any> = (payload: Readonly<Record<string, unknown>>, details: SendDetails<Answer>) => void;

/** What a generated piece's root is given: the host (for reads that reload) and the one callback that sends. */
export interface PieceWiring<Answer = any> {
  readonly host: WebHost;
  readonly onSend: SendCallback<Answer>;
}

export interface WebHost {
  /** The wrapped action: approval waits here (`needsApproval` asks `ask` once), and a write that finishes tells the reads it concerns. */
  readonly action: <Args, Answer>(options: ActionFactory<Args, Answer>) => Action<Args, Answer>;
  /** What a piece's root takes for this action: `{ host, onSend }`. */
  readonly wire: <Answer>(options: ActionFactory<any, Answer>) => PieceWiring<Answer>;
  /** Tells `listener` each time a write finishes on one of `things` (a thing's name, the prefix of an action's name); returns what stops it. */
  readonly onFinished: (things: ReadonlyArray<string>, listener: () => void) => () => void;
}

export interface WebHostApi {
  /** The host of a page: `client` is the generated SDK's layer, the person's credential in it; `ask` is how a person is asked for a yes. */
  readonly make: (options: { readonly client: Layer.Layer<any, any, never>; readonly ask: (request: ApprovalRequest) => Promise<boolean> }) => WebHost;
  /** What a piece outside the app's provider finds: every press is refused, saying why. */
  readonly missing: WebHost;
}
