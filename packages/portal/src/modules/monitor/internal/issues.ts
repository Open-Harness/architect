// Issues: one per (operation, step, error tag), first and last seen by the operation's declaration hash, kept past the window in the ledger the portal is
// handed. The portal keeps nothing else anywhere: a different ledger is a portal that has seen nothing. A call is counted once however many times the window
// is read (`seen` holds the calls still inside the window, by id, and is pruned as they leave it: a call that left cannot come back at a later `now`).
import { Effect } from "effect";
import { Telemetry } from "#modules/telemetry/service.js";
import type { MonitoredCall, PortalLive } from "#modules/telemetry/types.js";
import type { BlueprintWire } from "#modules/wire/types.js";
import type { IssueRow, MonitorLedger, Seen } from "../types.ts";

const KEY = "monitor/issues";

interface Stored {
  readonly operation: string;
  readonly step: string;
  readonly tag: string;
  readonly occurrences: number;
  readonly firstSeen: Seen;
  readonly lastSeen: Seen;
  /** The calls of this issue still inside the window: id to start. */
  readonly seen: Readonly<Record<string, number>>;
}
type Held = Readonly<Record<string, Stored>>;

const isSeen = (x: unknown): x is Seen => typeof x === "object" && x !== null && typeof (x as Seen).at === "number" && typeof (x as Seen).hash === "string";
const isStored = (x: unknown): x is Stored => {
  const s = x as Partial<Stored> | null;
  return typeof s === "object" && s !== null && typeof s.operation === "string" && typeof s.step === "string" && typeof s.tag === "string" && typeof s.occurrences === "number"
    && isSeen(s.firstSeen) && isSeen(s.lastSeen) && typeof s.seen === "object" && s.seen !== null;
};
/** What the ledger holds, as far as it is an issue book; anything else is an empty one (a ledger is opaque JSON the portal does not trust). */
const heldOf = (value: unknown): Held =>
  typeof value === "object" && value !== null ? Object.fromEntries(Object.entries(value as Record<string, unknown>).filter(([, v]) => isStored(v)) as Array<[string, Stored]>) : {};

const callId = (c: MonitoredCall) => Telemetry.identity(c);

const add = (held: Held, key: string, call: MonitoredCall, step: string, tag: string, hash: string, live: PortalLive): Held => {
  const issue = held[key];
  const at: Seen = { at: call.start, hash };
  if (issue === undefined) return { ...held, [key]: { operation: call.operation, step, tag, occurrences: 1, firstSeen: at, lastSeen: at, seen: { [callId(call)]: call.start } } };
  if (callId(call) in issue.seen) return held;
  const inWindow = Object.fromEntries(Object.entries(issue.seen).filter(([, start]) => start >= live.now - live.windowMs));
  return {
    ...held,
    [key]: {
      ...issue, occurrences: issue.occurrences + 1,
      firstSeen: call.start < issue.firstSeen.at ? at : issue.firstSeen,
      lastSeen: call.start > issue.lastSeen.at ? at : issue.lastSeen,
      seen: { ...inWindow, [callId(call)]: call.start },
    },
  };
};

const rowOf = (key: string, issue: Stored, blueprint: BlueprintWire): IssueRow => ({
  key, operation: issue.operation, step: issue.step, tag: issue.tag, owner: blueprint.model.operations[issue.operation]?.file ?? "unknown",
  occurrences: issue.occurrences, firstSeen: issue.firstSeen, lastSeen: issue.lastSeen, regressed: issue.firstSeen.hash !== issue.lastSeen.hash,
});

/** The issues the window's defects open, joined to the ones the ledger holds, written back when they changed. `calls` is `undefined` when the window could not be read. */
export const keep = (
  blueprint: BlueprintWire, live: PortalLive, calls: ReadonlyArray<MonitoredCall> | undefined, ledger: MonitorLedger | undefined,
): Effect.Effect<ReadonlyArray<IssueRow>> =>
  Effect.gen(function* () {
    const before = ledger === undefined ? {} : heldOf(yield* ledger.get(KEY).pipe(Effect.catchCause(() => Effect.succeed(undefined))));
    let held: Held = before;
    // Oldest first, so first and last seen fall out in order and a tie is the same on every read.
    const defects = (calls ?? []).filter((c) => c.outcome === "defect").sort((a, b) => a.start - b.start || (callId(a) < callId(b) ? -1 : 1));
    for (const call of defects) {
      const { failure } = call;
      if (failure === undefined) continue;
      const hash = blueprint.model.operations[call.operation]?.hash ?? "";
      held = add(held, `${call.operation}/${failure.step}/${failure.tag}`, call, failure.step, failure.tag, hash, live);
    }
    if (ledger !== undefined && JSON.stringify(held) !== JSON.stringify(before)) yield* ledger.put(KEY, held).pipe(Effect.catchCause(() => Effect.void));
    return Object.entries(held).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([key, issue]) => rowOf(key, issue, blueprint));
  });
