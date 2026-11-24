// Generated from the blueprint. Do not edit.
import type * as Source from "@orthograph/tickets/blueprint/things/report/thing.js";
import type * as Events from "@orthograph/tickets/blueprint/things/report/events.js";

type Declared = Extract<(typeof Source)[keyof typeof Source], { readonly kind: "thing" }>["fields"];
/** What a field or value holds, as the blueprint's own schema decodes it. */
type Of<F> = F extends { readonly value: { readonly schema: { readonly Type: infer T } } } ? T : F extends { readonly schema: { readonly Type: infer T } } ? T : never;

/** The states a report moves between, as its machine declares them. */
export type ReportState = "progress" | "waiting" | "ready" | "blocked" | "failed" | "dropped";

/** How the executor says a ticket stands. Its state is its kind. A field not every caller is shown (secret, or private to roles) may be missing from what a call returns. */
export type Report = {
  readonly "id": Of<Declared["id"]>;
  readonly "superagent": Of<Declared["superagent"]>;
  readonly "ticket": Of<Declared["ticket"]>;
  readonly "text": Of<Declared["text"]>;
  readonly "seq": Of<Declared["seq"]>;
  readonly "state": ReportState;
};

/** The event ReportMade: what it carries when a report moves. */
export type ReportMade = {
  readonly "superagent": Of<(typeof Events)["ReportMade"]["fields"]["superagent"]>;
  readonly "report": Of<(typeof Events)["ReportMade"]["fields"]["report"]>;
  readonly "ticket": Of<(typeof Events)["ReportMade"]["fields"]["ticket"]>;
};
