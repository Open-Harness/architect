// Reading the data API (`/_portal/v1/*`) from the browser: the blueprint, then the snapshot for its digest. A page is drawn from these two and from
// nothing else: no clock (`now` is the snapshot's), no project source. Types only from the wire, as the data API sends it; none of it is invented here.
import type { Effect } from "effect";
import type { BlueprintWire, PortalSnapshot, PortalTelemetry } from "@orthograph/portal";

/** Everything a page is drawn from: the blueprint, and the snapshot taken for exactly that blueprint's digest. */
export interface PortalData {
  readonly blueprint: BlueprintWire;
  /** The snapshot, and what the environment is doing now: `null` when this portal has no live source. */
  readonly snapshot: PortalSnapshot & { readonly telemetry: PortalTelemetry | null };
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

/** What the pages read: the latest `Loaded`, and a way to hear of a change (the shape `useSyncExternalStore` takes). */
export interface Store {
  readonly get: () => Loaded;
  readonly subscribe: (listener: () => void) => () => void;
  /** Put the answer in and tell every listener. Called once, by the entry, with what `load` came to. */
  readonly settle: (next: Loaded) => void;
}

export interface DataApi {
  /** Read the blueprint and its snapshot from the data API. Fails with what could not be read. */
  readonly load: () => Effect.Effect<PortalData, DataFailed>;
  /** `load`, as a `Loaded` (a failure is a value, never a throw). */
  readonly loaded: () => Effect.Effect<Loaded>;
  /** The one store every page reads, starting at `loading`. */
  readonly store: () => Store;
}
