// `ortho add journeys <thing>` (K16 e): a stub per path through the thing's machine, per role, per declared error and per
// rule an operation can break, from the model. Unlike the other kinds it writes the stubs that are missing, so after the machine grows it writes just the
// new paths, and refuses only when every one is already there.
import type { Model } from "@orthograph/compiler";
import { renderJourneyStubs } from "@orthograph/projections/shared";
import { AddRefused, type Planned } from "../types.ts";

export const journeysOf = (model: Model, thing: string, exists: (path: string) => boolean): Planned | AddRefused => {
  if (!model.things[thing]) return new AddRefused({ message: `"${thing}" isn't a thing in the blueprint: ${Object.keys(model.things).join(", ")}` });
  const stubs = renderJourneyStubs(model, thing).map((s) => ({ path: s.path, content: s.content }));
  if (stubs.length === 0) return new AddRefused({ message: `${thing} has no machine, roles or refusals to write journeys for` });
  const there = stubs.filter((s) => exists(s.path)).map((s) => s.path);
  if (there.length === stubs.length) return new AddRefused({ message: `already there, so nothing was written: ${there.join(", ")}` });
  return { write: stubs.filter((s) => !exists(s.path)), there };
};
