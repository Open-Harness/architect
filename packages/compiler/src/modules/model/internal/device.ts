// What an operation that doesn't run on the server can't have: there is no server there to know who calls, store
// anything, or move a machine.
import type { Operation } from "orthograph";

/** What an operation that doesn't run on the server needs: a language that does. Only the Effect language exists today. */
export const RUNS_NEEDS: Readonly<Record<string, string>> = {
  client: "an operation runs on the caller's own device only when a mounted plugin supplies it, with a code entry for each of node, browser and world; this app's own operations all run on the server",
  chain: "it needs a language that runs operations on a chain (language-solidity, or language-noir on Aztec), and this project's only language, language-effect, runs them all on the server",
};

/** What an operation on the device can't have: there is no server there to know who calls, store anything, or move a machine. */
export const deviceProblems = (file: string, op: Operation): ReadonlyArray<string> => [
  ...(op.allowed.every((a) => a.kind === "anyone") ? [] : [`${file}: a client operation runs on the caller's device, where no server knows who is calling: it must be allowed to Blueprint.anyone`]),
  ...(op.move ? [`${file}: a client operation has no store, so it can't move a machine`] : []),
  ...(Object.values(op.steps).some((s) => s.type === "call") ? [`${file}: a client operation can't have a call step yet (the wallet reaches the chain through the chain port as a library, M1-plugins section 8.2; a call step on the device waits for an adapter that needs one)`] : []),
  ...(op.idempotent ? [`${file}: a client operation has no server to keep an idempotency key`] : []),
];
