// Generated from the blueprint. Do not edit.
import type * as Source from "../../../../blueprint/things/mission/thing.ts";
import type * as Events from "../../../../blueprint/things/mission/events.ts";

type Declared = Extract<(typeof Source)[keyof typeof Source], { readonly kind: "thing" }>["fields"];
/** What a field or value holds, as the blueprint's own schema decodes it. */
type Of<F> = F extends { readonly value: { readonly schema: { readonly Type: infer T } } } ? T : F extends { readonly schema: { readonly Type: infer T } } ? T : never;

/** The states a mission moves between, as its machine declares them. */
export type MissionState = "intake" | "running" | "paused" | "done" | "stopped";

/** A goal: milestones of tasks over the blueprint, taken as far as one environment. A field not every caller is shown (secret, or private to roles) may be missing from what a call returns. */
export type Mission = {
  readonly "id": Of<Declared["id"]>;
  readonly "owner": Of<Declared["owner"]>;
  readonly "title": Of<Declared["title"]>;
  readonly "target": Of<Declared["target"]>;
  readonly "blueprint": Of<Declared["blueprint"]>;
  readonly "state": MissionState;
};

/** The event MissionFinished: what it carries when a mission moves. */
export type MissionFinished = {
  readonly "mission": Of<(typeof Events)["MissionFinished"]["fields"]["mission"]>;
};

/** The event MissionOpened: what it carries when a mission moves. */
export type MissionOpened = {
  readonly "mission": Of<(typeof Events)["MissionOpened"]["fields"]["mission"]>;
  readonly "title": Of<(typeof Events)["MissionOpened"]["fields"]["title"]>;
  readonly "target": Of<(typeof Events)["MissionOpened"]["fields"]["target"]>;
  readonly "blueprint": Of<(typeof Events)["MissionOpened"]["fields"]["blueprint"]>;
};

/** The event MissionPaused: what it carries when a mission moves. */
export type MissionPaused = {
  readonly "mission": Of<(typeof Events)["MissionPaused"]["fields"]["mission"]>;
  readonly "why": Of<(typeof Events)["MissionPaused"]["fields"]["why"]>;
};

/** The event MissionResumed: what it carries when a mission moves. */
export type MissionResumed = {
  readonly "mission": Of<(typeof Events)["MissionResumed"]["fields"]["mission"]>;
};

/** The event MissionStarted: what it carries when a mission moves. */
export type MissionStarted = {
  readonly "mission": Of<(typeof Events)["MissionStarted"]["fields"]["mission"]>;
};

/** The event MissionStopped: what it carries when a mission moves. */
export type MissionStopped = {
  readonly "mission": Of<(typeof Events)["MissionStopped"]["fields"]["mission"]>;
  readonly "why": Of<(typeof Events)["MissionStopped"]["fields"]["why"]>;
};
