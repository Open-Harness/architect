// Generated from the blueprint. Do not edit.
import type * as Source_ from "@orthograph/intake/blueprint/things/source/thing.js";
import type * as Events from "@orthograph/intake/blueprint/things/source/events.js";

type Declared = Extract<(typeof Source_)[keyof typeof Source_], { readonly kind: "thing" }>["fields"];
/** What a field or value holds, as the blueprint's own schema decodes it. */
type Of<F> = F extends { readonly value: { readonly schema: { readonly Type: infer T } } } ? T : F extends { readonly schema: { readonly Type: infer T } } ? T : never;

/** The states a source moves between, as its machine declares them. */
export type SourceState = "setup" | "ready" | "paused" | "error" | "off";

/** One connection of a superagent to an outside service, with the place it has read to. A field not every caller is shown (secret, or private to roles) may be missing from what a call returns. */
export type Source = {
  readonly "id": Of<Declared["id"]>;
  readonly "superagent": Of<Declared["superagent"]>;
  readonly "name": Of<Declared["name"]>;
  readonly "kind": Of<Declared["kind"]>;
  readonly "config": Of<Declared["config"]>;
  readonly "position": Of<Declared["position"]>;
  readonly "failures": Of<Declared["failures"]>;
  readonly "failAfter": Of<Declared["failAfter"]>;
  readonly "state": SourceState;
};

/** The event SourceDisabled: what it carries when a source moves. */
export type SourceDisabled = {
  readonly "source": Of<(typeof Events)["SourceDisabled"]["fields"]["source"]>;
};

/** The event SourceEnabled: what it carries when a source moves. */
export type SourceEnabled = {
  readonly "source": Of<(typeof Events)["SourceEnabled"]["fields"]["source"]>;
};

/** The event SourceFailed: what it carries when a source moves. */
export type SourceFailed = {
  readonly "source": Of<(typeof Events)["SourceFailed"]["fields"]["source"]>;
};

/** The event SourcePositionAdvanced: what it carries when a source moves. */
export type SourcePositionAdvanced = {
  readonly "source": Of<(typeof Events)["SourcePositionAdvanced"]["fields"]["source"]>;
  readonly "position": Of<(typeof Events)["SourcePositionAdvanced"]["fields"]["position"]>;
};

/** The event SourceSaved: what it carries when a source moves. */
export type SourceSaved = {
  readonly "source": Of<(typeof Events)["SourceSaved"]["fields"]["source"]>;
  readonly "superagent": Of<(typeof Events)["SourceSaved"]["fields"]["superagent"]>;
};
