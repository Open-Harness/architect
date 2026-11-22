// The portal's pages, drawn in the browser (K19). A route is read from `location.pathname`; a page is drawn from `/_portal/v1/*` and
// from nothing else: no clock, no project source. Types only here, from the wire; none of this reaches a Worker.
import type { MonitorView } from "#modules/monitor/types.js";
import type { PortalSnapshot } from "#modules/snapshot/types.js";
import type { PortalTelemetry } from "#modules/telemetry/types.js";
import type { BlueprintWire } from "#modules/wire/types.js";

/** Where a path under `/portal` goes. `missing` is a path that is not a page (a thing or operation the blueprint does not declare is one too). */
export type Route =
  | { readonly page: "home" }
  | { readonly page: "thing"; readonly name: string }
  | { readonly page: "operation"; readonly name: string; readonly tab: string }
  | { readonly page: "environment"; readonly name: string }
  | { readonly page: "plugins" }
  | { readonly page: "journeys" }
  | { readonly page: "worlds" }
  | { readonly page: "compare" }
  | { readonly page: "reference"; readonly kind: "access" | "refusals" | "events" | "values" | "machines" }
  | { readonly page: "trace"; readonly id: string }
  | { readonly page: "monitor" }
  | { readonly page: "alerts" }
  | { readonly page: "issues" }
  | { readonly page: "missing" };

/** Everything a page is drawn from: the blueprint, and the snapshot taken for exactly that blueprint's digest. */
export interface PortalData {
  readonly blueprint: BlueprintWire;
  /** The snapshot, and what the environment is doing now: `null` when this portal has no live source. */
  readonly snapshot: PortalSnapshot & { readonly telemetry: PortalTelemetry | null };
  /** The alerts the environment evaluates and the issues it holds (M1.49): `null` when this portal has no live source to read them from. */
  readonly monitor: MonitorView | null;
}

/** The data could not be read: which request, and what it answered. The page says so; it never draws a tick it could not read. */
export interface DataFailed {
  readonly _tag: "DataFailed";
  readonly request: string;
  readonly reason: string;
}

/** A page that is loading, one drawn from its data, or one that could not be. */
export type Loaded =
  | { readonly state: "loading" }
  | { readonly state: "ready"; readonly data: PortalData }
  | { readonly state: "failed"; readonly failure: DataFailed };

export interface PagesApi {
  /** The whole client: the one component the browser entry mounts, with the path it was opened at. */
  readonly App: (props: { readonly pathname: string; readonly search?: string }) => import("react").ReactElement;
  /** The route of a path (`/portal/things/handle`) and its query (`?tab=metrics`), or `missing` for one that is not a page of the portal. */
  readonly routeOf: (pathname: string, search?: string) => Route;
  /** Read the blueprint and its snapshot from the data API. Fails with what could not be read. */
  readonly load: () => import("effect").Effect.Effect<PortalData, DataFailed>;
}
