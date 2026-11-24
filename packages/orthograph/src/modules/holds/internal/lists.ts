import type { Delivery, Held, Hold, Unheld } from "../types.ts";

/** The app's two lists, each frozen: what the hold holds, and what it does not, each with its reason. */
export const listed = (hold: Hold, held: ReadonlyArray<Delivery>, unheld: ReadonlyArray<Unheld>): Held =>
  Object.freeze({ kind: "holds", hold, held: Object.freeze([...held]), unheld: Object.freeze([...unheld]) });
