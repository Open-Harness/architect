import { existsSync } from "node:fs";
import { Names } from "orthograph/server";
import { Effect } from "effect";
import { Compare, type Depends, type Model, type Versioned } from "@orthograph/compiler";
import type { Impact as Impacted, ImpactApi, Shipped } from "./types.ts";
import { evidenceHolds, modelHash, storyHash } from "#modules/verdicts/internal/proof.js";
import { ledgerPath, readLedger, writeLedger } from "./internal/ledger.ts";
import { select as selectChanged, settle as settleChanged } from "./internal/changed.ts";
import { stampOf } from "./internal/files.ts";

const holds = (model: Model, depends: Depends) => Object.entries(depends).every(([key, hash]) => Compare.hashOf(model, key) === hash);

const record: ImpactApi["record"] = (root, model, verdicts, results) =>
  Effect.sync(() => {
    const prior = readLedger(root);
    const before = prior?.proven ?? {};
    const hash = results === undefined ? undefined : modelHash(model);
    const proofs = new Map(results?.map(({ operation, journeys }) => [operation, { storyHash: storyHash(model, operation, (journeys ?? []).map((v) => v.journey)), journeys: journeys ?? [] }]));
    // Still proven from before, unless this run judged it.
    const kept = Object.entries(before).filter(([op, depends]) => {
      const evidence = prior?.verdicts?.[op];
      return holds(model, depends) && !verdicts.some((v) => v.operation === op)
        && (evidence === undefined || evidenceHolds(root, model, op, evidence.storyHash, evidence.journeys));
    });
    const passed = Object.keys(model.operations).filter((op) => {
      const mine = verdicts.filter((v) => v.operation === op);
      const evidence = proofs.get(op);
      return mine.length > 0 && mine.every((v) => v.failures.length === 0)
        && (evidence === undefined || (evidence.journeys.every((v) => v.modelHash === hash) && evidenceHolds(root, model, op, evidence.storyHash, evidence.journeys)));
    });
    const proven = Object.fromEntries([...kept, ...passed.map((op) => [op, Compare.dependsOn(model, op)] as const)].sort(([a], [b]) => a.localeCompare(b)));
    for (const [op] of kept) {
      const evidence = prior?.verdicts?.[op];
      if (evidence) proofs.set(op, evidence);
    }
    writeLedger(root, { model, proven, ...(proofs.size === 0 ? {} : { verdicts: Object.fromEntries(proofs) }), ...(prior?.changed ? { changed: prior.changed } : {}) });
  });

const stamp: ImpactApi["stamp"] = (root, model) => Effect.sync(() => stampOf(root, model));

const select: ImpactApi["select"] = (root, model, taken) =>
  Effect.sync(() => {
    const prior = readLedger(root)?.changed;
    return selectChanged(taken, model, prior, existsSync(ledgerPath(root)) && prior === undefined ? `no record of an earlier prove (${Names.folder}/evidence/proven.json holds none that can be read)` : undefined);
  });

const settle: ImpactApi["settle"] = (root, model, ran, taken) =>
  Effect.sync(() => {
    const ledger = readLedger(root);
    if (ledger !== undefined) writeLedger(root, { ...ledger, changed: settleChanged(taken, ledger.changed, ran) });
  });

const of: ImpactApi["of"] = (root, model) =>
  Effect.sync((): Impacted => {
    const ledger = readLedger(root);
    const ops = Object.keys(model.operations);
    const proven = ledger?.proven ?? {};
    const stale = Object.keys(proven).filter((op) => {
      const evidence = ledger?.verdicts?.[op];
      return op in model.operations && (!holds(model, proven[op]!) || (evidence !== undefined && !evidenceHolds(root, model, op, evidence.storyHash, evidence.journeys)));
    });
    const edges = Compare.edges(model);
    return {
      ...(edges.length > 0 ? { edges } : {}),
      changes: ledger ? Compare.models(ledger.model, model) : [],
      stale,
      proven: ops.filter((op) => op in proven && !stale.includes(op)),
      unproven: ops.filter((op) => !(op in proven)),
    };
  });

const list = (names: ReadonlyArray<string>) => (names.length === 0 ? "none" : names.join(", "));

const staleLine = (shipped: Shipped) =>
  shipped.stale.length === 0
    ? "stale none"
    : `stale ${list(shipped.stale.map((s) => s.operation))} in ${list([...new Set(shipped.stale.flatMap((s) => s.environments))])}`;

const line = (c: Versioned) => `${c.kind} ${c.what} ${c.bump}${c.detail ? ` (${c.detail})` : ""}`;

/** What the logbook says, with the local ledger only for what it alone knows: the declarations and what is stale on this machine. */
const shippedLines = (impact: Impacted, shipped: Shipped): ReadonlyArray<string> => {
  const stale = new Set(shipped.stale.map((s) => s.operation));
  const everything = [...impact.proven, ...impact.stale, ...impact.unproven].sort();
  return [
    ...(shipped.from === null ? [] : [`changes since ${shipped.from}`, ...shipped.changes.map(line)]),
    `next ${shipped.version}`,
    staleLine(shipped),
    ...(impact.stale.length > 0 ? [`locally stale ${list(impact.stale)}`] : []),
    `proven ${list(shipped.proven)}`,
    ...(everything.some((op) => !shipped.proven.includes(op) && !stale.has(op)) ? [`unproven ${list(everything.filter((op) => !shipped.proven.includes(op) && !stale.has(op)))}`] : []),
  ];
};

const lines: ImpactApi["lines"] = (impact, shipped) => [...(impact.edges ?? []), ...(shipped
    ? shippedLines(impact, shipped)
    : [
        ...impact.changes.map((c) => `${c.change} ${c.kind} ${c.name}${c.parts.length ? `: ${c.parts.join(", ")}` : ""}`),
        `stale ${list(impact.stale)}`,
        `proven ${list(impact.proven)}`,
        ...(impact.unproven.length > 0 ? [`unproven ${list(impact.unproven)}`] : []),
      ])];

export const Impact: ImpactApi = { record, stamp, select, settle, of, lines };
