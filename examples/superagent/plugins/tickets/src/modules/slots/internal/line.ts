import type { Waiting } from "../types.ts";

/** Every person's message first, then every other, each group in the order it was given (oldest first). */
export const personsFirst = (waiting: ReadonlyArray<Waiting>): ReadonlyArray<Waiting> => [
  ...waiting.filter((w) => w.why === "person"),
  ...waiting.filter((w) => w.why !== "person"),
];
