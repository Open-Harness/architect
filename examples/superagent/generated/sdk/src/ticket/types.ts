// Generated from the blueprint. Do not edit.
import type * as Source from "@orthograph/tickets/blueprint/things/ticket/thing.js";
import type * as Events from "@orthograph/tickets/blueprint/things/ticket/events.js";

type Declared = Extract<(typeof Source)[keyof typeof Source], { readonly kind: "thing" }>["fields"];
/** What a field or value holds, as the blueprint's own schema decodes it. */
type Of<F> = F extends { readonly value: { readonly schema: { readonly Type: infer T } } } ? T : F extends { readonly schema: { readonly Type: infer T } } ? T : never;

/** The states a ticket moves between, as its machine declares them. */
export type TicketState = "open" | "ended" | "stopped";

/** One piece of work a superagent was allowed to do, with the executor that works it. A field not every caller is shown (secret, or private to roles) may be missing from what a call returns. */
export type Ticket = {
  readonly "id": Of<Declared["id"]>;
  readonly "superagent": Of<Declared["superagent"]>;
  readonly "title": Of<Declared["title"]>;
  readonly "agent": Of<Declared["agent"]>;
  readonly "seq": Of<Declared["seq"]>;
  readonly "state": TicketState;
};

/** The event TicketCreated: what it carries when a ticket moves. */
export type TicketCreated = {
  readonly "superagent": Of<(typeof Events)["TicketCreated"]["fields"]["superagent"]>;
  readonly "ticket": Of<(typeof Events)["TicketCreated"]["fields"]["ticket"]>;
};

/** The event TicketEnded: what it carries when a ticket moves. */
export type TicketEnded = {
  readonly "superagent": Of<(typeof Events)["TicketEnded"]["fields"]["superagent"]>;
  readonly "ticket": Of<(typeof Events)["TicketEnded"]["fields"]["ticket"]>;
};

/** The event TicketResumed: what it carries when a ticket moves. */
export type TicketResumed = {
  readonly "superagent": Of<(typeof Events)["TicketResumed"]["fields"]["superagent"]>;
  readonly "ticket": Of<(typeof Events)["TicketResumed"]["fields"]["ticket"]>;
};

/** The event TicketStopped: what it carries when a ticket moves. */
export type TicketStopped = {
  readonly "superagent": Of<(typeof Events)["TicketStopped"]["fields"]["superagent"]>;
  readonly "ticket": Of<(typeof Events)["TicketStopped"]["fields"]["ticket"]>;
};
