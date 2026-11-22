// How check 40 judges a machine's lighting (see graph-light.ts for what each mode means): structure lights nothing, live puts the window's moves on
// the move edges, trace lights one journey's path. The labels of the edges come from the laid data (the move's key); the numbers come from the model and the fixture.
import type { Laid } from "./graph-expect.ts";
import type { Lit } from "./graph-light.ts";
import type { SeenGraph } from "./graph-page.ts";

export type Lighting =
  | { readonly mode: "structure" }
  | { readonly mode: "live"; readonly counts: Readonly<Record<string, number>>; readonly thing: string }
  | { readonly mode: "trace"; readonly trace: Readonly<Record<string, Lit>> };

export const litProblems = (what: string, seen: SeenGraph | undefined, laid: Laid | undefined, want: Lighting): ReadonlyArray<string> => {
  if (seen === undefined || laid === undefined) return [];
  const out: Array<string> = [];
  if (seen.mode !== want.mode) out.push(`${what}: the graph says its lighting is ${String(seen.mode)}, it was asked for ${want.mode}`);
  for (const e of laid.edges) {
    const d = seen.edges.find((x) => x.edge === e.id);
    if (d === undefined) continue;
    const key = e.label ?? "";
    const expected = want.mode === "structure" ? { lit: false, count: "", moved: "", refused: "" }
      : want.mode === "live" ? { lit: (want.counts[`${want.thing}.${key}`] ?? 0) > 0, count: String(want.counts[`${want.thing}.${key}`] ?? 0), moved: "", refused: "" }
        : { lit: (want.trace[key]?.moved.length ?? 0) + (want.trace[key]?.refused.length ?? 0) > 0, count: "", moved: (want.trace[key]?.moved ?? []).join(","), refused: (want.trace[key]?.refused ?? []).join(",") };
    const got = { lit: d.lit === "true", count: d.count ?? "", moved: d.moved ?? "", refused: d.refused ?? "" };
    if (d.lit !== "true" && d.lit !== "false") out.push(`${what}: edge \`${key}\` says data-lit "${String(d.lit)}", not true or false`);
    for (const field of ["lit", "count", "moved", "refused"] as const) if (got[field] !== expected[field]) out.push(`${what}: ${want.mode}: move \`${key}\` has ${field} ${JSON.stringify(got[field])}, expected ${JSON.stringify(expected[field])}`);
  }
  return out;
};
