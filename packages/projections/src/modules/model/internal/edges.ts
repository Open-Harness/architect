import type { Model } from "@orthograph/compiler";
import type { RenderedFile } from "#modules/names/types.js";

/** What depends on what: a field naming another thing, an operation on its thing, a move emitting its event. */
export const renderEdges = (model: Model): RenderedFile => {
  const edges = [
    ...Object.values(model.things).flatMap((t) => Object.entries(t.fields).flatMap(([k, f]) =>
      f.ref && !f.ref.startsWith(`${t.name}.`) ? [{ from: `${t.name}.${k}`, to: f.ref, kind: "refers" }] : [])),
    ...Object.values(model.operations).flatMap((o) => [
      { from: o.name, to: o.thing, kind: o.kind === "read" ? "reads" : "acts-on" },
      ...(o.move ? [{ from: o.name, to: `${o.thing}.${o.move.emits}`, kind: "emits" }] : []),
      ...o.allowed.flatMap((a) => (a.kind === "role" || a.kind === "role-of" ? [{ from: o.name, to: a.role, kind: "allowed-by" }] : [])),
    ]),
  ];
  return { path: "generated/model/edges.json", scaffold: false, content: JSON.stringify(edges, null, 2) + "\n" };
};
