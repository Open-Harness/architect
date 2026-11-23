// What every generated piece shares (K29 section 2): its state, its options and the two apis. Framework-free.
import type { PrimitiveContext } from "@ui-sdk/core";
import type { PieceWiring, Refusal } from "#modules/host/types.js";

/**
 * The state a piece keeps: `pending` and `error` are the two keys UI SDK's bridge reads (it waits while `pending`, then fails the
 * step with `error`), so a refusal is written to both `refusal` (what the page shows) and `error` (what the agent reads).
 */
export interface PieceState<Answer> {
  readonly pending: boolean;
  readonly refusal: Refusal | null;
  readonly error: string | null;
  readonly done: boolean;
  /** What the operation answered: the agent's snapshot shows it. */
  readonly value: Answer | null;
}

/** A piece's options: the host's wiring, what to do when it finishes, and one string for each id field of the payload (the thing it is about). */
export type PieceOptions<Answer> = Partial<PieceWiring<Answer>> & {
  readonly onDone?: (answer: Answer) => void;
  readonly [field: string]: unknown;
};

export type PieceContext<Answer> = PrimitiveContext<PieceOptions<Answer>, PieceState<Answer> & object, string>;

/** What a move or a write sends: the fields the form holds, by the names the payload gives them, and the optional ones among them. */
export interface WriteSpec {
  readonly fields: ReadonlyArray<string>;
  readonly optional?: ReadonlyArray<string>;
  /** The id fields of the payload: not inputs, but options the page gives (`handle="hdl_…"`). */
  readonly subject?: ReadonlyArray<string>;
}

/** What a read loads with: its payload fields (each an option), and the things whose writes make it load again. */
export interface ReadSpec {
  readonly fields: ReadonlyArray<string>;
  readonly reloadsOn: ReadonlyArray<string>;
}

export interface WriteApi {
  /** Sends the form as the payload. Called by a person's press or Enter, and by an agent. */
  readonly submit: (event?: Event) => Promise<void>;
}

export interface ReadApi {
  /** Loads again: an agent's action. */
  readonly reload: () => Promise<void>;
  /** Loads once the piece is on the page, and again when a write on its things finishes; returns what stops listening. */
  readonly start: () => () => void;
}
