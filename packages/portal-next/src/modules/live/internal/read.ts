// What the snapshot's telemetry holds, when the source read: each reader is `undefined` for a source that is absent or failed.
import type { Availability, CallsView, CountsView, OperationCounts } from "@orthograph/portal";
import type { PortalData } from "../../data/types.ts";

const availableOf = <T,>(a: Availability<T> | undefined): T | undefined => (a?.state === "available" ? a.value : undefined);

export const countsOf = (d: PortalData): CountsView | undefined => availableOf(d.snapshot.telemetry?.metrics);
export const callsViewOf = (d: PortalData): CallsView | undefined => availableOf(d.snapshot.telemetry?.calls);

export const sum = (ops: ReadonlyArray<OperationCounts>, key: "calls" | "answered" | "refused" | "defects"): string => String(ops.reduce((n, o) => n + o[key], 0));
