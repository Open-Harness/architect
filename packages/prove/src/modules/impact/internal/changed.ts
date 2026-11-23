// `prove --changed`: what the last proof's record says to rerun, and the record a run leaves.
import type { Model } from "@orthograph/compiler";
import { scenarioOf } from "#modules/verdicts/internal/proof.js";
import type { Proof, Ran, Selection, Stamp } from "../types.ts";
import { differing } from "./files.ts";

/** What today's files (the stamp, taken before the run) say has to run again, measured from the record of the last proof. */
export const select = (stamp: Stamp, model: Model, prior: Proof | undefined, noRecord = "no record of an earlier prove"): Selection => {
  const all = Object.keys(stamp.journeys).sort();
  const everything = (reason: string, files: ReadonlyArray<string>): Selection => ({ rerun: all, skipped: [], judge: Object.keys(model.operations), fellBack: { reason, files } });
  if (prior === undefined) return everything(noRecord, []);
  const lost = differing(prior.files, stamp.files).filter((path) => !stamp.placed.has(path));
  if (lost.length > 0) return everything(`cannot place ${lost.join(", ")}`, lost);
  // An operation is judged again when what it rests on changed, or when it has not passed.
  const judge = Object.keys(model.operations).filter((op) => prior.operations[op]?.inputs !== stamp.operations[op] || prior.operations[op]?.passed !== true);
  const touched = new Set(judge);
  const rerun = all.filter((file) => {
    const record = prior.journeys[file];
    return record === undefined || record.inputs !== stamp.journeys[file] || !record.passed || [...scenarioOf(model, model.journeys[file]!).operationNames].some((op) => touched.has(op));
  });
  return { rerun, skipped: all.filter((file) => !rerun.includes(file)), judge, fellBack: null };
};

type Entries = Readonly<Record<string, { readonly inputs: string; readonly passed: boolean }>>;

/** Each name's inputs as they were when the run began, and whether it passed: as this run judged it, else as the record had it. */
const entries = (inputs: Readonly<Record<string, string>>, was: Entries | undefined, now: ReadonlyArray<readonly [string, boolean]>): Entries => {
  const judged = new Map(now);
  return Object.fromEntries(Object.entries(inputs).flatMap(([name, hash]) => {
    const passed = judged.get(name) ?? was?.[name]?.passed;
    return passed === undefined ? [] : [[name, { inputs: hash, passed }] as const];
  }));
};

/** The record after a run, against the stamp taken before it: an edit made while it ran is a change the next run sees. */
export const settle = (stamp: Stamp, prior: Proof | undefined, ran: Ran): Proof => ({
  files: stamp.files,
  journeys: entries(stamp.journeys, prior?.journeys, ran.journeys.map((j) => [j.file, j.passed] as const)),
  operations: entries(stamp.operations, prior?.operations, ran.operations.map((o) => [o.operation, o.passed] as const)),
});
