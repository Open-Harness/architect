// Generated from the blueprint. Do not edit.
import type * as Source from "@orthograph/intake/blueprint/things/thread/thing.js";
import type * as Events from "@orthograph/intake/blueprint/things/thread/events.js";

type Declared = Extract<(typeof Source)[keyof typeof Source], { readonly kind: "thing" }>["fields"];
/** What a field or value holds, as the blueprint's own schema decodes it. */
type Of<F> = F extends { readonly value: { readonly schema: { readonly Type: infer T } } } ? T : F extends { readonly schema: { readonly Type: infer T } } ? T : never;

/** The states a thread moves between, as its machine declares them. */
export type ThreadState = "idle";

/** An issue, a pull request or a Slack thread a superagent listens to. One eval runs on it at a time. A field not every caller is shown (secret, or private to roles) may be missing from what a call returns. */
export type Thread = {
  readonly "id": Of<Declared["id"]>;
  readonly "superagent": Of<Declared["superagent"]>;
  readonly "source": Of<Declared["source"]>;
  readonly "key": Of<Declared["key"]>;
  readonly "channel": Of<Declared["channel"]>;
  readonly "state": ThreadState;
};

/** The event ThreadClosed: what it carries when a thread moves. */
export type ThreadClosed = {
  readonly "thread": Of<(typeof Events)["ThreadClosed"]["fields"]["thread"]>;
};

/** The event ThreadSubscribed: what it carries when a thread moves. */
export type ThreadSubscribed = {
  readonly "superagent": Of<(typeof Events)["ThreadSubscribed"]["fields"]["superagent"]>;
  readonly "thread": Of<(typeof Events)["ThreadSubscribed"]["fields"]["thread"]>;
};

/** The event ThreadUnsubscribed: what it carries when a thread moves. */
export type ThreadUnsubscribed = {
  readonly "superagent": Of<(typeof Events)["ThreadUnsubscribed"]["fields"]["superagent"]>;
  readonly "thread": Of<(typeof Events)["ThreadUnsubscribed"]["fields"]["thread"]>;
};
