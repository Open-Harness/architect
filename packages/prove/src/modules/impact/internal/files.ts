// What a proof rests on, read once: the project's files by content hash, the files the model places (those some operation,
// journey or starting world reaches by importing), and each operation's and journey's inputs from them.
import { Compare, handlerFiles, type Model } from "@orthograph/compiler";
import { handlerHash, scenarioOf } from "#modules/verdicts/internal/proof.js";
import type { Stamp } from "../types.ts";
import { graphOf, type Closure } from "./closure.ts";
import { digest, scan, type Snapshot } from "./scan.ts";

const sorted = (files: ReadonlySet<string>) => [...files].sort();

/**
 * Take the stamp: hash every file that can change a proof, once. An operation rests on its declaration and its handler and
 * every file they reach by importing (inside the project), and on what `Compare.dependsOn` tracks (things, mounts). A journey
 * rests on its file, the starting worlds it stands on, what those reach, and the operations they call. A file that is in no
 * such closure, or whose imports could not all be followed, is not placed: a change to it proves everything.
 */
export const stampOf = (root: string, model: Model): Stamp => {
  const snap: Snapshot = scan(root);
  const closure = graphOf(snap);
  // What reaches a file that imports by a specifier it cannot read rests on every file: its real target could be any of them.
  const through = (reached: Closure) => sorted(reached.wild.size > 0 ? new Set(snap.hashes.keys()) : reached.files).map((file) => [file, snap.hashes.get(file) ?? null]);
  const operations = new Map<string, { readonly inputs: string; readonly closure: Closure }>();
  for (const [name, op] of Object.entries(model.operations)) {
    const roots = [op.file, ...handlerFiles(op).map((h) => h.file)];
    const reached = closure(roots);
    // A plugin's declaration and handler live in its package, outside the project: what the model and the handler's hash say stands in.
    const outside = roots.filter((r) => !snap.hashes.has(r)).map((r) => (r === op.file ? op.hash : handlerHash(root, op) ?? null));
    operations.set(name, { closure: reached, inputs: digest(JSON.stringify([through(reached), outside, Compare.dependsOn(model, name)])) });
  }
  const journeys = new Map<string, { readonly inputs: string; readonly closure: Closure }>();
  for (const journey of Object.values(model.journeys)) {
    const scenario = scenarioOf(model, journey);
    const roots = [journey.file, ...scenario.worlds.map((w) => w.file)];
    const reached = closure(roots);
    const outside = roots.filter((r) => !snap.hashes.has(r)).map((r) => (r === journey.file ? journey.sourceHash : scenario.worlds.find((w) => w.file === r)?.sourceHash) ?? null);
    const calls = [...scenario.operationNames].sort().map((name) => operations.get(name)?.inputs ?? name);
    journeys.set(journey.file, { closure: reached, inputs: digest(JSON.stringify([through(reached), outside, calls])) });
  }
  // The starting worlds are roots too, whether or not a journey stands on one.
  const worlds = Object.values(model.startingWorlds).map((w) => closure([w.file]));
  const closures = [...operations.values(), ...journeys.values()].map((x) => x.closure).concat(worlds);
  const placed = new Set(closures.flatMap((c) => [...c.files].filter((file) => !c.opaque.has(file))));
  return {
    files: Object.fromEntries([...snap.hashes].sort(([a], [b]) => a.localeCompare(b))),
    placed,
    operations: Object.fromEntries([...operations].map(([name, x]) => [name, x.inputs])),
    journeys: Object.fromEntries([...journeys].filter(([file]) => model.journeys[file]?.blanks === undefined).map(([file, x]) => [file, x.inputs])),
  };
};

/** The files that differ between two records: changed, added or removed. */
export const differing = (was: Readonly<Record<string, string>>, now: Readonly<Record<string, string>>): ReadonlyArray<string> =>
  [...new Set([...Object.keys(was), ...Object.keys(now)])].filter((path) => was[path] !== now[path]).sort();
