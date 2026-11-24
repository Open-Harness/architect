// One plugin's names (blueprint-names.ts), judged against examples/superagent as `ortho generate` and `ortho model` give it:
// the model has every thing, state, move, field, event and error; the generated docs, CLI and MCP list every operation.
// Each failing test says which names are missing, so a builder reads what to add.
import { afterAll, describe, expect, it } from "vitest";
import { build, cliHelp, lazy, removeCopies, type Built, type Node } from "./app.ts";
import type { PluginNames } from "./blueprint-names.ts";

const sorted = (xs: ReadonlyArray<string> | undefined) => [...(xs ?? [])].sort();
const operationsOf = (p: PluginNames): ReadonlyArray<string> => [
  ...Object.entries(p.things).flatMap(([thing, t]) => t.ops.map((verb) => `${thing}.${verb}`)),
  ...(p.extraOps ?? []),
];

export const describePlugin = (id: string, p: PluginNames) => {
  describe(`${id} ${p.package}: what the design names is in the model, and in the docs, CLI and MCP`, () => {
    const built = lazy(build);
    afterAll(removeCopies);
    const things = (): Node => built().model["things"];

    it("each of its things is in the model, and comes from this package", () => {
      const wrong = Object.keys(p.things).filter((t) => things()[t]?.from?.package !== p.package);
      expect(wrong, `things missing, or not from ${p.package}`).toEqual([]);
    });

    it("each machine has exactly the states the design names, and each move it spells out", () => {
      const problems: Array<string> = [];
      for (const [name, t] of Object.entries(p.things)) {
        const machine = things()[name]?.machine as Node | undefined;
        if (t.states !== undefined && JSON.stringify(sorted(machine?.["states"])) !== JSON.stringify(sorted(t.states))) problems.push(`${name}: states ${JSON.stringify(sorted(machine?.["states"]))}, wanted ${JSON.stringify(sorted(t.states))}`);
        for (const [move, want] of Object.entries(t.moves ?? {})) {
          const got = machine?.["moves"]?.[move] as Node | undefined;
          if (got === undefined) { problems.push(`${name}: no move ${move}`); continue; }
          if (want.from !== undefined && JSON.stringify(sorted(got["from"])) !== JSON.stringify(sorted(want.from))) problems.push(`${name}.${move}: from ${JSON.stringify(got["from"])}, wanted ${JSON.stringify(want.from)}`);
          if (JSON.stringify(sorted(got["to"])) !== JSON.stringify(sorted(want.to))) problems.push(`${name}.${move}: to ${JSON.stringify(got["to"])}, wanted ${JSON.stringify(want.to)}`);
          if (want.emits !== undefined && got["emits"] !== want.emits) problems.push(`${name}.${move}: emits ${String(got["emits"])}, wanted ${want.emits}`);
        }
      }
      expect(problems).toEqual([]);
    });

    it("each thing has the fields the design names", () => {
      const missing = Object.entries(p.things).flatMap(([name, t]) => (t.fields ?? []).filter((f) => things()[name]?.fields?.[f] === undefined).map((f) => `${name}.${f}`));
      expect(missing).toEqual([]);
    });

    it("each operation and read it names is in the model, on its thing, and comes from this package", () => {
      const ops = built().model["operations"] as Node;
      const missing = operationsOf(p).filter((o) => ops[o] === undefined || ops[o].thing !== o.split(".")[0]);
      expect(missing, "operations missing from the model").toEqual([]);
      const elsewhere = operationsOf(p).filter((o) => ops[o]?.from?.package !== p.package);
      expect(elsewhere, `operations not declared by ${p.package}`).toEqual([]);
    });

    it("each event is declared by its thing, with the fields the design lists; each error is a refusal the model knows", () => {
      const problems: Array<string> = [];
      for (const [event, e] of Object.entries(p.events)) {
        const got = things()[e.thing]?.events?.[event] as Node | undefined;
        if (got === undefined) { problems.push(`${e.thing} declares no ${event}`); continue; }
        for (const f of e.fields ?? []) if (got[f] === undefined) problems.push(`${event} has no field ${f}`);
      }
      const refusals = built().model["refusals"] as Node;
      const operations = Object.values<any>(built().model["operations"]);
      for (const error of p.errors) {
        if (refusals[error] === undefined) problems.push(`no refusal ${error}`);
        else if (!operations.some((o) => (o.refusals ?? []).includes(error) || JSON.stringify(o.invariants ?? {}).includes(`"${error}"`))) problems.push(`no operation can refuse ${error}`);
      }
      expect(problems).toEqual([]);
    });

    it("the docs list every thing, operation, event and error: a page for each, linked from its thing's index", () => {
      const problems: Array<string> = [];
      for (const thing of Object.keys(p.things)) {
        let index = "";
        try { index = built().docs(`${thing}/index.md`); } catch { problems.push(`no docs page for thing ${thing}`); continue; }
        for (const o of operationsOf(p).filter((o) => o.startsWith(`${thing}.`))) {
          const verb = o.slice(thing.length + 1);
          if (!index.includes(`[${o}](${verb}.md)`)) problems.push(`${thing}/index.md does not list ${o}`);
          try { built().docs(`${thing}/${verb}.md`); } catch { problems.push(`no page ${thing}/${verb}.md`); }
        }
      }
      for (const [event, e] of Object.entries(p.events)) {
        let index = "";
        try { index = built().docs(`${e.thing}/index.md`); } catch { continue; }
        if (!index.includes(`\`${event}\``)) problems.push(`${e.thing}/index.md does not list the event ${event}`);
      }
      for (const error of p.errors) if (!new RegExp(`\\b${error}\\b`).test(built().allDocs)) problems.push(`no docs page names the error ${error}`);
      for (const o of p.extraOps ?? []) {
        const [thing, verb] = o.split(".") as [string, string];
        try { if (!built().docs(`${thing}/index.md`).includes(`[${o}](${verb}.md)`)) problems.push(`${thing}/index.md does not list ${o}`); } catch { problems.push(`no docs page for ${o}`); }
      }
      expect(problems).toEqual([]);
    });

    it("the generated CLI lists every operation: `<cli> <thing> --help` names each verb", () => {
      const byThing = new Map<string, Array<string>>();
      for (const o of operationsOf(p)) { const [thing, verb] = o.split(".") as [string, string]; byThing.set(thing, [...(byThing.get(thing) ?? []), verb]); }
      const problems: Array<string> = [];
      for (const [thing, verbs] of byThing) {
        const help = cliHelp(built().root, thing);
        if (help.status !== 0) { problems.push(`\`${thing} --help\` exits ${String(help.status)}`); continue; }
        for (const v of verbs) if (!new RegExp(`^\\s{2}${v}\\s`, "m").test(help.out)) problems.push(`\`${thing} --help\` does not list ${v}`);
      }
      expect(problems).toEqual([]);
    });

    it("the generated MCP catalog has a tool for every operation", () => {
      const missing = operationsOf(p).filter((o) => !built().mcp.includes(`"${o}":`));
      expect(missing).toEqual([]);
    });
  });
};

/** What the generated docs, CLI and MCP are missing of these full operation names (`thing.verb`): nothing, when each has a docs page linked from its thing's index, a CLI subcommand and an MCP tool. */
export const surfaceProblems = (b: Built, ops: ReadonlyArray<string>): ReadonlyArray<string> => {
  const problems: Array<string> = [];
  const help = new Map<string, string>();
  for (const o of ops) {
    const [thing, verb] = o.split(".") as [string, string];
    try { if (!b.docs(`${thing}/index.md`).includes(`[${o}](${verb}.md)`)) problems.push(`docs: ${thing}/index.md does not list ${o}`); } catch { problems.push(`docs: no page for thing ${thing}`); }
    try { b.docs(`${thing}/${verb}.md`); } catch { problems.push(`docs: no page ${thing}/${verb}.md`); }
    if (!help.has(thing)) { const h = cliHelp(b.root, thing); help.set(thing, h.status === 0 ? h.out : ""); }
    if (!new RegExp(`^\\s{2}${verb}\\s`, "m").test(help.get(thing) ?? "")) problems.push(`cli: \`${thing} --help\` does not list ${verb}`);
    if (!b.mcp.includes(`"${o}":`)) problems.push(`mcp: no tool ${o}`);
  }
  return problems;
};
