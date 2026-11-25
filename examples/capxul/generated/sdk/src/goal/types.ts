// Generated from the blueprint. Do not edit.
import type * as Source from "../../../../blueprint/things/goal/thing.ts";
import type * as Events from "../../../../blueprint/things/goal/events.ts";

type Declared = Extract<(typeof Source)[keyof typeof Source], { readonly kind: "thing" }>["fields"];
/** What a field or value holds, as the blueprint's own schema decodes it. */
type Of<F> = F extends { readonly value: { readonly schema: { readonly Type: infer T } } } ? T : F extends { readonly schema: { readonly Type: infer T } } ? T : never;

/** The states a goal moves between, as its machine declares them. */
export type GoalState = "pending" | "inProgress" | "completed" | "archived" | "closed";

/** Something an employee aims to do in an appraisal cycle, under one KRA. A field not every caller is shown (secret, or private to roles) may be missing from what a call returns. */
export type Goal = {
  readonly "id": Of<Declared["id"]>;
  readonly "company": Of<Declared["company"]>;
  readonly "employee": Of<Declared["employee"]>;
  readonly "appraisalCycle": Of<Declared["appraisalCycle"]>;
  readonly "kra": Of<Declared["kra"]>;
  readonly "goalName": Of<Declared["goalName"]>;
  readonly "progress": Of<Declared["progress"]>;
  /** Whether the goal holds other goals, its progress following theirs (HRMS's `is_group`). */
  readonly "isGroup": Of<Declared["isGroup"]>;
  readonly "parentGoal"?: Of<Declared["parentGoal"]>;
  readonly "state": GoalState;
};

/** The event GoalArchived: what it carries when a goal moves. */
export type GoalArchived = {
  readonly "goal": Of<(typeof Events)["GoalArchived"]["fields"]["goal"]>;
};

/** The event GoalClosed: what it carries when a goal moves. */
export type GoalClosed = {
  readonly "goal": Of<(typeof Events)["GoalClosed"]["fields"]["goal"]>;
};

/** The event GoalCompleted: what it carries when a goal moves. */
export type GoalCompleted = {
  readonly "goal": Of<(typeof Events)["GoalCompleted"]["fields"]["goal"]>;
};

/** The event GoalCreated: what it carries when a goal moves. */
export type GoalCreated = {
  readonly "goal": Of<(typeof Events)["GoalCreated"]["fields"]["goal"]>;
  readonly "employee": Of<(typeof Events)["GoalCreated"]["fields"]["employee"]>;
  readonly "kra": Of<(typeof Events)["GoalCreated"]["fields"]["kra"]>;
};

/** The event GoalProgressUpdated: what it carries when a goal moves. */
export type GoalProgressUpdated = {
  readonly "goal": Of<(typeof Events)["GoalProgressUpdated"]["fields"]["goal"]>;
};

/** The event GoalReopened: what it carries when a goal moves. */
export type GoalReopened = {
  readonly "goal": Of<(typeof Events)["GoalReopened"]["fields"]["goal"]>;
};

/** The event GoalRolledUp: what it carries when a goal moves. */
export type GoalRolledUp = {
  readonly "goal": Of<(typeof Events)["GoalRolledUp"]["fields"]["goal"]>;
};

/** The event GoalUnarchived: what it carries when a goal moves. */
export type GoalUnarchived = {
  readonly "goal": Of<(typeof Events)["GoalUnarchived"]["fields"]["goal"]>;
};
