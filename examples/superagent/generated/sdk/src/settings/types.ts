// Generated from the blueprint. Do not edit.
import type * as Source from "../../../../blueprint/things/settings/thing.ts";
import type * as Events from "../../../../blueprint/things/settings/events.ts";

type Declared = Extract<(typeof Source)[keyof typeof Source], { readonly kind: "thing" }>["fields"];
/** What a field or value holds, as the blueprint's own schema decodes it. */
type Of<F> = F extends { readonly value: { readonly schema: { readonly Type: infer T } } } ? T : F extends { readonly schema: { readonly Type: infer T } } ? T : never;

/** The states a settings moves between, as its machine declares them. */
export type SettingsState = "current";

/** The app's settings: execution variables and blocked commands. One current version, every save kept. A field not every caller is shown (secret, or private to roles) may be missing from what a call returns. */
export type Settings = {
  readonly "id": Of<Declared["id"]>;
  readonly "revision": Of<Declared["revision"]>;
  readonly "variables": Of<Declared["variables"]>;
  readonly "blocked": Of<Declared["blocked"]>;
  readonly "saved": Of<Declared["saved"]>;
  readonly "state": SettingsState;
};

/** The event SettingsSaved: what it carries when a settings moves. */
export type SettingsSaved = {
  readonly "settings": Of<(typeof Events)["SettingsSaved"]["fields"]["settings"]>;
  readonly "revision": Of<(typeof Events)["SettingsSaved"]["fields"]["revision"]>;
};
