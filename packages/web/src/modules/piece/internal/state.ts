// How a call's end lands in a piece's state, and how it reads to a person and to an agent.
import type { Outcome, Refusal } from "#modules/host/types.js";
import type { PieceState } from "../types.ts";

export const idle = <Answer>(): PieceState<Answer> => ({ pending: false, refusal: null, error: null, done: false, value: null });

/** What a piece shows and an agent reads of a refusal: its name and code, then the world's sentence when it gave one. */
export const refusedText = (refusal: Refusal): string => {
  const named = refusal.code === "" ? refusal.name : `${refusal.name} (${refusal.code})`;
  return refusal.message === "" || refusal.message === refusal.name ? named : `${named}: ${refusal.message}`;
};

/** An answer as one line: `handle: hdl_…`. An answer with nothing in it says "Done". */
export const answerText = (answer: unknown): string => {
  const entries = Object.entries((answer ?? {}) as Record<string, unknown>);
  return entries.length === 0 ? "Done" : entries.map(([key, value]) => `${key}: ${typeof value === "string" ? value : JSON.stringify(value, (_k, v: unknown) => (typeof v === "bigint" ? v.toString() : v))}`).join(", ");
};

/** The state a finished call leaves: the answer and nothing pending, or the refusal in both places the page and the bridge read. */
export const landed = <Answer>(outcome: Outcome<Answer>): Partial<PieceState<Answer>> =>
  outcome.ok
    ? { pending: false, refusal: null, error: null, done: true, value: outcome.answer }
    : { pending: false, refusal: outcome.refusal, error: refusedText(outcome.refusal), done: false, value: null };

/** The state while a call is out. */
export const sending = <Answer>(keep: Answer | null = null): Partial<PieceState<Answer>> => ({ pending: true, refusal: null, error: null, done: false, value: keep });
