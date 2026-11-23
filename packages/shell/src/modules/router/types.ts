// The router: a small runtime over the generated route table (`generated/app/routes.json`). A route is its path with `:name` parameters; a
// path matches by segments, with no regular expression the app can reach. It knows nothing of the browser: `history` carries the address.

/** A route's parameters, decoded: `{ handle: "a b" }` for `/@a%20b`. */
export type Params = Readonly<Record<string, string>>;

/** One row of `routes.json`: the page, its path, the names of its parameters in the order the path has them, its parent. */
export interface RouteRow {
  readonly page: string;
  readonly path: string;
  readonly params: ReadonlyArray<string>;
  readonly parent?: string;
}

/** The contents of `generated/app/routes.json`, as they are. */
export interface RouteTable {
  readonly routes: ReadonlyArray<RouteRow>;
}

/** What an address resolves to. An address that resolves to nothing is the 404, never a blank. */
export interface Match {
  readonly page: string;
  readonly params: Params;
}

export interface Router {
  /** The page a pathname is, with its parameters decoded; `undefined` when no route matches. */
  readonly match: (pathname: string) => Match | undefined;
  /**
   * A page's address: every parameter its path has, taken from `params` and percent-encoded. `undefined` when one is missing or the page is unknown,
   * so passing the current route's parameters gives a link only where the current route has every one the page needs.
   */
  readonly href: (page: string, params: Params) => string | undefined;
  /** The parents of a page, home first and the page last. A chain that does not reach `home` starts with it. */
  readonly chain: (page: string) => ReadonlyArray<string>;
}
