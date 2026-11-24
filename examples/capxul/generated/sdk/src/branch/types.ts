// Generated from the blueprint. Do not edit.
import type * as Source from "../../../../blueprint/things/branch/thing.ts";
import type * as Events from "../../../../blueprint/things/branch/events.ts";

type Declared = Extract<(typeof Source)[keyof typeof Source], { readonly kind: "thing" }>["fields"];
/** What a field or value holds, as the blueprint's own schema decodes it. */
type Of<F> = F extends { readonly value: { readonly schema: { readonly Type: infer T } } } ? T : F extends { readonly schema: { readonly Type: infer T } } ? T : never;

/** The states a branch moves between, as its machine declares them. */
export type BranchState = "active";

/** A place a company works from, such as an office or a site. A field not every caller is shown (secret, or private to roles) may be missing from what a call returns. */
export type Branch = {
  readonly "id": Of<Declared["id"]>;
  readonly "company": Of<Declared["company"]>;
  readonly "branchName": Of<Declared["branchName"]>;
  readonly "state": BranchState;
};

/** The event BranchCreated: what it carries when a branch moves. */
export type BranchCreated = {
  readonly "branch": Of<(typeof Events)["BranchCreated"]["fields"]["branch"]>;
  readonly "company": Of<(typeof Events)["BranchCreated"]["fields"]["company"]>;
};
