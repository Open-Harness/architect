// Generated from the blueprint. Do not edit.
import type * as Source from "@orthograph/tickets/blueprint/things/outgoing-message/thing.js";
import type * as Events from "@orthograph/tickets/blueprint/things/outgoing-message/events.js";

type Declared = Extract<(typeof Source)[keyof typeof Source], { readonly kind: "thing" }>["fields"];
/** What a field or value holds, as the blueprint's own schema decodes it. */
type Of<F> = F extends { readonly value: { readonly schema: { readonly Type: infer T } } } ? T : F extends { readonly schema: { readonly Type: infer T } } ? T : never;

/** The states an outgoing-message moves between, as its machine declares them. */
export type OutgoingMessageState = "pending" | "sent" | "dropped";

/** One reply to a person, kept until it is sent: in order, the head of its conversation first. A field not every caller is shown (secret, or private to roles) may be missing from what a call returns. */
export type OutgoingMessage = {
  readonly "id": Of<Declared["id"]>;
  readonly "superagent": Of<Declared["superagent"]>;
  readonly "ticket": Of<Declared["ticket"]>;
  readonly "conversation": Of<Declared["conversation"]>;
  readonly "purpose": Of<Declared["purpose"]>;
  readonly "text": Of<Declared["text"]>;
  readonly "failures": Of<Declared["failures"]>;
  readonly "notBefore": Of<Declared["notBefore"]>;
  readonly "state": OutgoingMessageState;
};

/** The event ReplyQueued: what it carries when an outgoing-message moves. */
export type ReplyQueued = {
  readonly "superagent": Of<(typeof Events)["ReplyQueued"]["fields"]["superagent"]>;
  readonly "ticket": Of<(typeof Events)["ReplyQueued"]["fields"]["ticket"]>;
  readonly "message": Of<(typeof Events)["ReplyQueued"]["fields"]["message"]>;
};

/** The event ReplySettled: what it carries when an outgoing-message moves. */
export type ReplySettled = {
  readonly "superagent": Of<(typeof Events)["ReplySettled"]["fields"]["superagent"]>;
  readonly "message": Of<(typeof Events)["ReplySettled"]["fields"]["message"]>;
};

/** The event ReplyWithdrawn: what it carries when an outgoing-message moves. */
export type ReplyWithdrawn = {
  readonly "superagent": Of<(typeof Events)["ReplyWithdrawn"]["fields"]["superagent"]>;
  readonly "message": Of<(typeof Events)["ReplyWithdrawn"]["fields"]["message"]>;
};
