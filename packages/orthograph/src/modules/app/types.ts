// The app's map (K31, K36): the pages an app has, their addresses, who may open them, and its menus. A declaration says
// what a page shows and offers, never how it looks. Each is one file under `blueprint/app/`, named by its path.
import type { Field } from "#modules/things/types.js";
import type { Allowed } from "#modules/roles/types.js";
import type { Operation, Read } from "#modules/operations/types.js";
import type { Value } from "#modules/values/types.js";

/** A route parameter's type: a field of a thing (`Handle.fields.name`), or a value (`Blueprint.text()`). */
export type RouteParam = Field | Value;

export interface Route {
  /** The address, with its parameters written as `:name` (`/@:handle`). */
  readonly path: string;
  /** Every parameter the path names, typed; `{}` for none. */
  readonly params: Readonly<Record<string, RouteParam>>;
}

/** What a page shows (reads) or offers (operations): an operation or a read of the blueprint. */
export type Reach = Operation | Read;

export interface ComponentSpec {
  readonly description: string;
  /** The reads (answers) it shows. */
  readonly shows?: ReadonlyArray<Reach>;
  /** The operations it offers. */
  readonly offers?: ReadonlyArray<Reach>;
}

/** A composite component (K36): the wiring of a region of a page, declared; its behaviour stays code. Named by its file. */
export interface AppComponent extends ComponentSpec {
  readonly kind: "app-component";
}

export interface PageSpec extends ComponentSpec {
  readonly route: Route;
  /** Who may open it, as an operation's `allowed`. */
  readonly allowed: ReadonlyArray<Allowed>;
  /** The page above it in the breadcrumb: the page, or a thunk of it, for a parent that is also its own child's parent. */
  readonly parent?: AppPage | (() => AppPage);
  /** The components it holds; their `shows` and `offers` count as its own. */
  readonly components?: ReadonlyArray<AppComponent>;
}

/** A page of the app. Not `Page`, which is a read's page of results. Named by its file in `blueprint/app/pages/`. */
export interface AppPage extends PageSpec {
  readonly kind: "app-page";
}

export type LayoutName = "sidebar" | "topNav" | "none";

export interface AppLayout {
  readonly kind: "app-layout";
  readonly which: LayoutName;
}

export interface NavGroupSpec {
  readonly title: string;
  readonly pages: ReadonlyArray<AppPage>;
  /** Whether the group starts folded. Default false. */
  readonly folded?: boolean;
}

export interface NavGroup extends NavGroupSpec {
  readonly kind: "app-nav-group";
  readonly folded: boolean;
}

export interface AppSpec {
  readonly description: string;
  readonly layout: AppLayout;
  readonly home: AppPage;
  readonly nav: ReadonlyArray<NavGroup>;
}

/** The app: its layout, home and navigation. `blueprint/app/app.ts`, the default export. */
export interface App extends AppSpec {
  readonly kind: "app";
}

export interface AppApi {
  readonly app: (spec: AppSpec) => App;
  readonly page: (spec: PageSpec) => AppPage;
  readonly component: (spec: ComponentSpec) => AppComponent;
  readonly layout: { readonly sidebar: AppLayout; readonly topNav: AppLayout; readonly none: AppLayout };
  readonly nav: { readonly group: (spec: NavGroupSpec) => NavGroup };
}
