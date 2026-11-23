// The portal's server half, as a route of an environment's Worker (K19): the data at `/_portal/v1/*`, and the prebuilt client's static
// files at `/portal`. Nothing here draws a page; the pages are drawn in the browser by the client, from this data.
import type { Effect } from "effect";
import type { MonitorLedger } from "#modules/monitor/types.js";
import type { LogbookReader } from "#modules/reader/types.js";
import type { PortalLive } from "#modules/telemetry/types.js";
import type { BlueprintWire } from "#modules/wire/types.js";

/** Where the portal's static files are: the Worker's assets binding (`assets.binding`), which answers a request for a file of the client. */
export interface PortalAssets {
  readonly fetch: (request: Request) => Promise<Response>;
}

/** The Worker's variables the portal reads. Every one is optional: a portal without a logbook shows nothing green. */
export interface PortalEnv {
  /** Where the logbook is. Held by the Worker, never sent to a browser. */
  readonly ORTHO_LOGBOOK_URL?: string;
  /** The revision this environment's bundle is. */
  readonly ORTHO_REVISION?: string;
  readonly ORTHO_ENVIRONMENT?: string;
  /** Where the world's starter answers its telemetry window (a loopback URL, local worlds only): the snapshot's `telemetry` and the trace pages read it. */
  readonly ORTHO_PORTAL_FEED?: string;
  /** Where the monitor keeps its issues past the window (M1.49, `portal.md` hole 7): a key-value binding, the shape of Workers KV. Without one they live as long as the isolate does. */
  readonly PORTAL_LEDGER?: PortalLedgerBinding;
  /** The client's files, as the Worker's static assets (K19). Without them `/portal` says the client is missing. */
  readonly PORTAL_ASSETS?: PortalAssets;
}

/** A key-value store as a Worker binds one (Workers KV has this shape): strings by key. */
export interface PortalLedgerBinding {
  readonly get: (key: string) => Promise<string | null>;
  readonly put: (key: string, value: string) => Promise<unknown>;
}

/** A decoded blueprint, its logbook reader if it has one, and the bundle's revision: all `handle` needs. */
export interface PortalContext {
  readonly blueprint: BlueprintWire;
  readonly reader: LogbookReader | null;
  readonly bundleRevision: string | null;
  /** Default `refs/heads/main`. */
  readonly ref?: string;
  /** The environment's live traffic: the window's spans and `ortho.calls`, read at `now`. Without it the snapshot's `telemetry` is null and the portal has no numbers. */
  readonly live?: PortalLive;
  /** Where the monitor keeps its issues past the window. Without one the monitor keeps nothing: it shows the window's issues and no older ones. */
  readonly ledger?: MonitorLedger;
}

export interface ServerApi {
  /** Is this path the portal's: `/portal`, anything under it, or anything under `/_portal/`. */
  readonly owns: (pathname: string) => boolean;
  /** The data API: `/_portal/v1/*` answered, anything else a 404. Always succeeds: every failure is a status and a reason, never a page with a tick. */
  readonly handle: (context: PortalContext, request: Request) => Effect.Effect<Response>;
  /** The portal for a Worker: the generated blueprint JSON is decoded once (rejected when its schema or digest is not one this portal accepts), the logbook comes from the variables, `/portal*` comes from the client's static files. */
  readonly serve: (blueprint: unknown, request: Request, env: PortalEnv) => Effect.Effect<Response>;
}
