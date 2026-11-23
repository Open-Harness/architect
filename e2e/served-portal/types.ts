// The served portal, as a person meets it (K19): the project's Worker answers `/_portal/v1/*` (data) and serves the portal's prebuilt
// client at `/portal` (static files); the pages render in the browser from that data. This module plays the Worker for a check and
// opens the result in headless Chromium, so check 21 and the grid's portal evals read what a person reads, never HTML a server drew.

/** Why a served portal could not be opened. Every message names K19 and what the builder owes. */
export class ServedPortalUnavailable extends Error {
  readonly _tag = "ServedPortalUnavailable";
  readonly reason: "no-server" | "no-client" | "no-browser" | "never-ready";
  constructor(reason: "no-server" | "no-client" | "no-browser" | "never-ready", message: string) { super(message); this.reason = reason; }
}

/**
 * What `@orthograph/portal/server` must export (K19): the data API, no React, no HeroUI. `handle` takes what `Portal.handle` takes
 * today (the portal's context and a `Request`) and is an Effect that succeeds with a `Response`; it answers `/_portal/v1/*` and
 * nothing else.
 */
export interface PortalServerModule {
  readonly PortalServer: { readonly handle: (context: unknown, request: Request) => unknown };
}

export interface DataAnswer { readonly status: number; readonly text: string }

/** A data response the browser fetched while a page rendered. */
export interface Fetched { readonly path: string; readonly status: number; readonly text: string }

export interface RenderedPage {
  /** The page's own verdict: `data-status` on `[data-portal="page"]` (200, or 404 for a route that is not a page). The shell itself is always 200. */
  readonly status: number;
  /** The DOM after the page signalled ready, serialised (`page.content()`). */
  readonly html: string;
  /** Every `/_portal/v1/*` response the browser read to draw it. */
  readonly fetched: ReadonlyArray<Fetched>;
}

export interface ServedPortal {
  readonly url: string;
  /** Open `route` (`/portal/things/handle?tab=x`) in the browser and wait for the page to say it is ready. */
  readonly page: (route: string) => Promise<RenderedPage>;
  /** The same route as a PNG: a fixed viewport, no animation, no caret. */
  readonly shoot: (route: string) => Promise<Uint8Array>;
  /** Run an expression in the opened route's page, once it is ready, and return what it gives (JSON). For a check that must walk the DOM. */
  readonly evaluate: <T>(route: string, expression: string) => Promise<T>;
  /** A data request, straight to the Worker (`/_portal/v1/blueprint`), no browser. */
  readonly data: (path: string) => Promise<DataAnswer>;
  readonly close: () => Promise<void>;
}

export interface OpenOptions {
  /** The portal's context: what `Portal.handle` takes (blueprint, reader, bundleRevision, live). Unused with `url`. */
  readonly context?: unknown;
  /** A portal already served by a Worker (`http://127.0.0.1:<port>`, a world `ortho` started): the harness plays no Worker and opens routes of it. */
  readonly url?: string;
  /** Where the built client is. Default: `packages/portal/dist/client`. */
  readonly clientDir?: string;
  /** The server module, when a control supplies its own. Default: `@orthograph/portal/server`. */
  readonly server?: PortalServerModule;
  /** The module the server half is imported from, when `server` is not given. Default: `@orthograph/portal/server`. A control names one that cannot exist, or one with no `PortalServer`. */
  readonly serverSpecifier?: string;
  /** A browser launcher, for a control that makes the launch fail. Default: Playwright's Chromium, shared by the process. */
  readonly launch?: () => Promise<import("playwright").Browser>;
  /** Run the Effect the server's `handle` returned. Default: `Effect.runPromise`. */
  readonly run?: (effect: unknown) => Promise<Response>;
}

export interface ServedPortalsApi {
  readonly open: (options: OpenOptions) => Promise<ServedPortal>;
  /** The grid's page port: `(route) => the rendered page's HTML`, over a blueprint (the wire's JSON), served once. `undefined` for a page that is not a 200 or a portal that cannot be served (`onUnavailable` says why, K19). */
  readonly pages: (wire: unknown, serve?: Omit<OpenOptions, "context">, onUnavailable?: (message: string) => void) => (route: string) => import("effect").Effect.Effect<string | undefined>;
  /** Close every portal opened, and the browser. Call it in `afterAll`. */
  readonly closeAll: () => Promise<void>;
}

/** The hooks the harness reads, named once. A builder's client must give them. */
export const HOOKS = { ready: '[data-portal="page"][data-ready="true"]', page: '[data-portal="page"]' } as const;

/** The browser's clock, fixed (`Date` only): the 9th of September 2001. A client that reads the time shows this, which no check expects. */
export const CLOCK_ISO = "2001-09-09T01:46:40.000Z";
