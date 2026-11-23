// The `app` projection is a `Projection` (orthograph's plugins module). What it works from is the map as one view, whether the
// blueprint declared it (`model.app`) or it is derived (K31 section 5); the view is never written into the model.
import type { AllowedModel } from "@orthograph/compiler";
export type { Projection } from "orthograph";

/** A component of a page: what it shows and offers (K36). */
export interface ViewComponent {
  readonly name: string;
  readonly description: string;
  readonly shows: ReadonlyArray<string>;
  readonly offers: ReadonlyArray<string>;
}

/** A page of the map, with its effective lists. */
export interface ViewPage {
  readonly name: string;
  readonly path: string;
  /** The names of the route's parameters, in the order the path has them. */
  readonly params: ReadonlyArray<string>;
  readonly description: string;
  readonly parent?: string;
  readonly allowed: ReadonlyArray<AllowedModel>;
  readonly shows: ReadonlyArray<string>;
  readonly offers: ReadonlyArray<string>;
  readonly components: ReadonlyArray<ViewComponent>;
}

export interface ViewGroup {
  readonly title: string;
  readonly folded: boolean;
  readonly pages: ReadonlyArray<{ readonly page: string; readonly path: string }>;
}

/** The map as the files are made from it: pages by name, groups in the order declared. */
export interface MapView {
  readonly layout: string;
  readonly home: string;
  readonly pages: ReadonlyArray<ViewPage>;
  readonly groups: ReadonlyArray<ViewGroup>;
}

/** One line of the palette: a page the caller may open, or an operation they may call where they are. */
export type PaletteEntry =
  | { readonly kind: "page"; readonly name: string; readonly path: string; readonly description: string; readonly allowed: ReadonlyArray<AllowedModel> }
  | { readonly kind: "operation"; readonly name: string; readonly page: string; readonly component: string | null; readonly description: string; readonly allowed: ReadonlyArray<AllowedModel> };
