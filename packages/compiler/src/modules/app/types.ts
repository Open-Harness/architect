// The app's map in the model (K31, K36): `model.app`, present only when the blueprint has an `app/` folder.
import type { App, AppComponent, AppPage, LayoutName, Operation, Read, Role, Thing, Value } from "orthograph";
import type { LoadedFile } from "#modules/source/types.js";
import type { AllowedModel, FieldModel, Model } from "#modules/model/types.js";

/** A page: its file, its route with each parameter typed, who may open it, and what it shows and offers (its own, then its components'). */
export interface PageModel {
  readonly name: string;
  readonly file: string;
  readonly description: string;
  readonly route: { readonly path: string; readonly params: Readonly<Record<string, FieldModel>> };
  /** The page above it; absent for a page at the top. */
  readonly parent?: string;
  readonly allowed: ReadonlyArray<AllowedModel>;
  /** The effective lists, as operation names (`profile.get`): the page's own, then each component's, each named once. */
  readonly shows: ReadonlyArray<string>;
  readonly offers: ReadonlyArray<string>;
  /** The components it holds, by name. */
  readonly components: ReadonlyArray<string>;
  readonly hash: string;
}

/** A composite component (K36): what a region of a page shows and offers, which no single operation says. */
export interface ComponentModel {
  readonly name: string;
  readonly file: string;
  readonly description: string;
  readonly shows: ReadonlyArray<string>;
  readonly offers: ReadonlyArray<string>;
  readonly hash: string;
}

/** A navigation group: pages by name, in the order declared. */
export interface NavGroupModel {
  readonly title: string;
  readonly pages: ReadonlyArray<string>;
  readonly folded: boolean;
}

export interface AppModel {
  readonly description: string;
  readonly layout: LayoutName;
  readonly home: string;
  readonly nav: ReadonlyArray<NavGroupModel>;
  readonly pages: Readonly<Record<string, PageModel>>;
  readonly components: Readonly<Record<string, ComponentModel>>;
  readonly hash: string;
}

/** The files of `blueprint/app/`, read: the app, each page and each component by the name its file gives it. */
export interface AppFiles {
  /** Whether the blueprint has an `app/` folder at all. */
  readonly present: boolean;
  readonly app: { readonly file: string; readonly declaration: App } | undefined;
  readonly pages: ReadonlyMap<string, { readonly file: string; readonly declaration: AppPage }>;
  readonly components: ReadonlyMap<string, { readonly file: string; readonly declaration: AppComponent }>;
  readonly problems: ReadonlyArray<string>;
}

/** What the app's declarations are matched against: the blueprint's own layout (the model's `Layout` has this shape), by the names its paths gave. */
export interface AppWorld {
  readonly values: ReadonlyMap<string, Value>;
  readonly things: ReadonlyMap<string, {
    readonly thing?: Thing | undefined;
    readonly roles: ReadonlyMap<string, Role>;
    readonly verbs: ReadonlyMap<string, { readonly declaration: Operation | Read }>;
  }>;
}

export interface AppApi {
  /** Take the `app/` files out of the blueprint's files, before the rest is laid out; what is left is what `readLayout` reads. */
  readonly setAside: (files: ReadonlyArray<LoadedFile>) => { readonly app: AppFiles; readonly rest: ReadonlyArray<LoadedFile> };
  /** The map, once the model is described: `app` absent when the blueprint has no `app/` folder. Problems each name their file. */
  readonly describe: (files: AppFiles, world: AppWorld, model: Model) => { readonly app?: AppModel; readonly problems: ReadonlyArray<string> };
}
