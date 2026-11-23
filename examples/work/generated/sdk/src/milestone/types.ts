// Generated from the blueprint. Do not edit.
import type * as Source from "../../../../blueprint/things/milestone/thing.ts";
import type * as Events from "../../../../blueprint/things/milestone/events.ts";

type Declared = Extract<(typeof Source)[keyof typeof Source], { readonly kind: "thing" }>["fields"];
/** What a field or value holds, as the blueprint's own schema decodes it. */
type Of<F> = F extends { readonly value: { readonly schema: { readonly Type: infer T } } } ? T : F extends { readonly schema: { readonly Type: infer T } } ? T : never;

/** The states a milestone moves between, as its machine declares them. */
export type MilestoneState = "active" | "dropped";

/** A stage of a mission: which steps of the build loop, over which thing or operation, and how far. A field not every caller is shown (secret, or private to roles) may be missing from what a call returns. */
export type Milestone = {
  readonly "id": Of<Declared["id"]>;
  readonly "mission": Of<Declared["mission"]>;
  readonly "title": Of<Declared["title"]>;
  readonly "kinds": Of<Declared["kinds"]>;
  readonly "of": Of<Declared["of"]>;
  readonly "until": Of<Declared["until"]>;
  readonly "state": MilestoneState;
};

/** The event MilestoneAdded: what it carries when a milestone moves. */
export type MilestoneAdded = {
  readonly "milestone": Of<(typeof Events)["MilestoneAdded"]["fields"]["milestone"]>;
  readonly "mission": Of<(typeof Events)["MilestoneAdded"]["fields"]["mission"]>;
  readonly "kinds": Of<(typeof Events)["MilestoneAdded"]["fields"]["kinds"]>;
  readonly "of": Of<(typeof Events)["MilestoneAdded"]["fields"]["of"]>;
  readonly "until": Of<(typeof Events)["MilestoneAdded"]["fields"]["until"]>;
};

/** The event MilestoneDropped: what it carries when a milestone moves. */
export type MilestoneDropped = {
  readonly "milestone": Of<(typeof Events)["MilestoneDropped"]["fields"]["milestone"]>;
};
