import { Clock, Effect } from "effect";
import { Wire } from "#modules/wire/service.js";
import type { BlueprintWire, ModelCore } from "#modules/wire/types.js";
import type { PortalProof, PortalSnapshot, SnapshotApi } from "./types.ts";
import { type Held, judge, unavailable } from "./internal/judge.ts";
import { headOf, stableRead } from "./internal/read.ts";

const MAIN = "refs/heads/main";
/** The order a revision travels, then anything else a project declares. `local` is never kept in the logbook. */
const ORDER = ["test", "staging", "production"];

const environmentsOf = (blueprint: BlueprintWire): ReadonlyArray<string> => {
  const declared = Object.keys(blueprint.model.environments ?? {}).filter((n) => n !== "local");
  const names = declared.length === 0 ? ORDER : declared;
  return [...names].sort((a, b) => (ORDER.indexOf(a) === -1 ? 99 : ORDER.indexOf(a)) - (ORDER.indexOf(b) === -1 ? 99 : ORDER.indexOf(b)) || a.localeCompare(b));
};

/** The blueprint's own model, as what the logbook holds would be read, so a head the logbook cannot give still has something to judge against. */
const bundleCore = (blueprint: BlueprintWire) => Wire.core(blueprint.model).pipe(Effect.catch(() => Effect.succeed<ModelCore>({ things: {}, operations: {} })));

const take: SnapshotApi["take"] = ({ blueprint, reader, bundleRevision, ref = MAIN, now }) =>
  Effect.gen(function* () {
    const observedAt = new Date(now ?? (yield* Clock.currentTimeMillis)).toISOString();
    const environments = environmentsOf(blueprint);
    const bundle = yield* bundleCore(blueprint);
    const base = {
      schemaVersion: 1 as const, blueprintDigest: blueprint.digest, observedAt, bundleRevision, environments,
      comparison: { state: "unavailable", reason: "the generated model comparison is not part of schema version 1" } as const,
    };
    // Nothing could be read: every cell says why, and none is a tick.
    const nothing = (reason: string, operations: ReadonlyArray<string>): PortalSnapshot => ({
      ...base, consistency: "unavailable", candidate: { revision: bundleRevision, source: "bundle" }, operations,
      proofs: environments.flatMap((e) => operations.map((o) => unavailable(o, e, reason))),
      release: { state: "unavailable", reason },
    });
    const bundled = Object.keys(bundle.operations).sort();
    if (reader === null) return nothing("no logbook is configured for this portal", bundled);
    const read = yield* stableRead(reader, ref).pipe(Effect.result);
    if (read._tag === "Failure") return nothing(read.failure.reason, bundled);
    const { rows, release, models } = read.success;

    const head = headOf(rows);
    const headModel: Held | undefined = head === undefined ? undefined : models.get(head);
    const fromLogbook = headModel?.ok === true;
    const current = headModel?.ok === true ? headModel.model : bundle;
    const operations = Object.keys(current.operations).sort();
    const newest = new Map(rows.map((r) => [`${r.environment}/${r.operation}`, r] as const));
    const candidate = fromLogbook ? head! : bundleRevision;
    const proofs: ReadonlyArray<PortalProof> = environments.flatMap((environment) =>
      operations.map((operation) => {
        const row = newest.get(`${environment}/${operation}`);
        return judge({ operation, environment, row, proved: row === undefined ? undefined : models.get(row.revision), current, candidate });
      }),
    );
    return {
      ...base, consistency: "checked", candidate: { revision: candidate, source: fromLogbook ? "logbook" : "bundle" }, operations, proofs,
      release: { state: "available", value: release },
    } satisfies PortalSnapshot;
  });

export const Snapshot: SnapshotApi = { take };
