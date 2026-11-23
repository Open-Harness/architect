// Generated from the blueprint. Do not edit.
import type * as Source from "../../../../blueprint/things/sheet/thing.ts";
import type * as Events from "../../../../blueprint/things/sheet/events.ts";

type Declared = Extract<(typeof Source)[keyof typeof Source], { readonly kind: "thing" }>["fields"];
/** What a field or value holds, as the blueprint's own schema decodes it. */
type Of<F> = F extends { readonly value: { readonly schema: { readonly Type: infer T } } } ? T : F extends { readonly schema: { readonly Type: infer T } } ? T : never;

/** The states a sheet moves between, as its machine declares them. */
export type SheetState = "open" | "full" | "closed";

/** A sign-up sheet with a fixed number of places. A field not every caller is shown (secret, or private to roles) may be missing from what a call returns. */
export type Sheet = {
  readonly "id": Of<Declared["id"]>;
  readonly "title": Of<Declared["title"]>;
  readonly "places": Of<Declared["places"]>;
  readonly "taken": Of<Declared["taken"]>;
  readonly "state": SheetState;
};

/** The event PlaceTaken: what it carries when a sheet moves. */
export type PlaceTaken = {
  readonly "sheet": Of<(typeof Events)["PlaceTaken"]["fields"]["sheet"]>;
  readonly "left": Of<(typeof Events)["PlaceTaken"]["fields"]["left"]>;
};

/** The event SheetClosed: what it carries when a sheet moves. */
export type SheetClosed = {
  readonly "sheet": Of<(typeof Events)["SheetClosed"]["fields"]["sheet"]>;
};

/** The event SheetOpened: what it carries when a sheet moves. */
export type SheetOpened = {
  readonly "sheet": Of<(typeof Events)["SheetOpened"]["fields"]["sheet"]>;
  readonly "places": Of<(typeof Events)["SheetOpened"]["fields"]["places"]>;
};
