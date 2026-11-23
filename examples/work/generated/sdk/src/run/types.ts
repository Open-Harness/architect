// Generated from the blueprint. Do not edit.
import type * as Source from "../../../../blueprint/things/run/thing.ts";
import type * as Events from "../../../../blueprint/things/run/events.ts";

type Declared = Extract<(typeof Source)[keyof typeof Source], { readonly kind: "thing" }>["fields"];
/** What a field or value holds, as the blueprint's own schema decodes it. */
type Of<F> = F extends { readonly value: { readonly schema: { readonly Type: infer T } } } ? T : F extends { readonly schema: { readonly Type: infer T } } ? T : never;

/** The states a run moves between, as its machine declares them. */
export type RunState = "running" | "waiting" | "finished" | "failed" | "stopped";

/** One agent working one task: which agent type, on which model, with what budget. A field not every caller is shown (secret, or private to roles) may be missing from what a call returns. */
export type Run = {
  readonly "id": Of<Declared["id"]>;
  readonly "mission": Of<Declared["mission"]>;
  readonly "task": Of<Declared["task"]>;
  readonly "agent": Of<Declared["agent"]>;
  readonly "model": Of<Declared["model"]>;
  readonly "budget": Of<Declared["budget"]>;
  readonly "state": RunState;
};

/** The event RunFailed: what it carries when a run moves. */
export type RunFailed = {
  readonly "run": Of<(typeof Events)["RunFailed"]["fields"]["run"]>;
  readonly "why": Of<(typeof Events)["RunFailed"]["fields"]["why"]>;
};

/** The event RunFinished: what it carries when a run moves. */
export type RunFinished = {
  readonly "run": Of<(typeof Events)["RunFinished"]["fields"]["run"]>;
  readonly "branch": Of<(typeof Events)["RunFinished"]["fields"]["branch"]>;
};

/** The event RunReported: what it carries when a run moves. */
export type RunReported = {
  readonly "run": Of<(typeof Events)["RunReported"]["fields"]["run"]>;
  readonly "report": Of<(typeof Events)["RunReported"]["fields"]["report"]>;
  readonly "note": Of<(typeof Events)["RunReported"]["fields"]["note"]>;
};

/** The event RunStarted: what it carries when a run moves. */
export type RunStarted = {
  readonly "run": Of<(typeof Events)["RunStarted"]["fields"]["run"]>;
  readonly "mission": Of<(typeof Events)["RunStarted"]["fields"]["mission"]>;
  readonly "task": Of<(typeof Events)["RunStarted"]["fields"]["task"]>;
  readonly "agent": Of<(typeof Events)["RunStarted"]["fields"]["agent"]>;
  readonly "model": Of<(typeof Events)["RunStarted"]["fields"]["model"]>;
};

/** The event RunStopped: what it carries when a run moves. */
export type RunStopped = {
  readonly "run": Of<(typeof Events)["RunStopped"]["fields"]["run"]>;
  readonly "why": Of<(typeof Events)["RunStopped"]["fields"]["why"]>;
};
