// Generated from the blueprint. Do not edit.
import type * as Source from "@orthograph/superagent/blueprint/things/proposal/thing.js";
import type * as Events from "@orthograph/superagent/blueprint/things/proposal/events.js";

type Declared = Extract<(typeof Source)[keyof typeof Source], { readonly kind: "thing" }>["fields"];
/** What a field or value holds, as the blueprint's own schema decodes it. */
type Of<F> = F extends { readonly value: { readonly schema: { readonly Type: infer T } } } ? T : F extends { readonly schema: { readonly Type: infer T } } ? T : never;

/** The states a proposal moves between, as its machine declares them. */
export type ProposalState = "waiting" | "approved" | "rejected";

/** What a main agent would change in a superagent's configuration, and why, waiting for a person. A field not every caller is shown (secret, or private to roles) may be missing from what a call returns. */
export type Proposal = {
  readonly "id": Of<Declared["id"]>;
  readonly "superagent": Of<Declared["superagent"]>;
  readonly "operation": Of<Declared["operation"]>;
  readonly "changes": Of<Declared["changes"]>;
  readonly "why": Of<Declared["why"]>;
  readonly "state": ProposalState;
};

/** The event ProposalApproved: what it carries when a proposal moves. */
export type ProposalApproved = {
  readonly "proposal": Of<(typeof Events)["ProposalApproved"]["fields"]["proposal"]>;
};

/** The event ProposalRecorded: what it carries when a proposal moves. */
export type ProposalRecorded = {
  readonly "proposal": Of<(typeof Events)["ProposalRecorded"]["fields"]["proposal"]>;
  readonly "superagent": Of<(typeof Events)["ProposalRecorded"]["fields"]["superagent"]>;
};

/** The event ProposalRejected: what it carries when a proposal moves. */
export type ProposalRejected = {
  readonly "proposal": Of<(typeof Events)["ProposalRejected"]["fields"]["proposal"]>;
};
