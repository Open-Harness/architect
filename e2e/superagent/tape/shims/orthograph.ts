// Throwaway: `orthograph` plus the one descriptor GOAL17-check-harness call 3 puts in it, `outbox`, written as the record writes it.
// A step is plain data, which is all a journey needs of it; the real `Probe` and `Stand` (the harness's surface, a builder's first pull request) replace it.
export * from "orthograph-real";

const world = (method: "GET" | "POST", route: string) => (args: unknown) => ({ kind: "world-call" as const, route, method, args });
export const outbox = {
  mark: world("GET", "outbox/mark"),
  rows: world("GET", "outbox"),
  redeliver: world("POST", "outbox/redeliver"),
  hold: world("POST", "outbox/hold"),
  release: world("POST", "outbox/release"),
};
