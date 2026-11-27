// `ortho add journeys <thing>` (K16 e): a stub per path through the thing's machine, per role, per declared error and per
// rule an operation can break, from the model. Unlike the other kinds it writes the stubs that are missing, so after the machine grows it writes just the
// new paths, and refuses only when every one is already there.
import type { Model } from "@orthograph/compiler";
import { renderJourneyStubs } from "@orthograph/projections/shared";
import { AddRefused, type Planned } from "../types.ts";

const count = (n: number) => `${n} blank${n === 1 ? "" : "s"}`;

/**
 * What of the thing is still unfinished, each in words. An operation or a read with a blank is not in the model's operations
 * until it is filled (#742), so it gets no stub: the command says which, where, and how many blanks, rather than nothing.
 */
const unfinishedOf = (model: Model, thing: string): ReadonlyArray<string> => [
  ...(model.blanks?.[thing] ? [`the ${thing} itself still has ${count(model.blanks[thing]!.length)}`] : []),
  ...Object.values(model.blankOperations ?? {}).filter((op) => op.thing === thing).map((op) => `${op.name} still has ${count(op.blanks.length)} in ${op.file}`),
];

export const journeysOf = (model: Model, thing: string, exists: (path: string) => boolean): Planned | AddRefused => {
  if (!model.things[thing]) return new AddRefused({ message: `"${thing}" isn't a thing in the blueprint: ${Object.keys(model.things).join(", ")}` });
  const stubs = renderJourneyStubs(model, thing).map((s) => ({ path: s.path, content: s.content }));
  const unfinished = unfinishedOf(model, thing);
  if (stubs.length === 0) {
    return new AddRefused({ message: unfinished.length > 0
      ? `${thing} has nothing to write journeys for yet: ${unfinished.join("; ")}. Fill the blanks (ortho check names each), then run this again`
      : `${thing} has no machine, roles or refusals to write journeys for` });
  }
  const there = stubs.filter((s) => exists(s.path)).map((s) => s.path);
  const left = unfinished.length > 0 ? `; no stubs for what is unfinished: ${unfinished.join("; ")}` : "";
  if (there.length === stubs.length) return new AddRefused({ message: `already there, so nothing was written: ${there.join(", ")}${left}` });
  return { write: stubs.filter((s) => !exists(s.path)), there, unfinished };
};
