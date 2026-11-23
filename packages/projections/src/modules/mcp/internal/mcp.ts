// generated/mcp: the remote MCP server's catalog, one entry per operation and read (D3 #122). The tool's name is the
// operation's, its description the model's, its input schema the declaration's own payload (made at run time by the
// runtime's `Mcp`, which leaves out whatever is not public). The server wires each entry to its served operation.
import { Names } from "orthograph/server";
import type { Model } from "@orthograph/compiler";
import { GENERATED, lines, opVar, ruleBehind } from "#modules/names/service.js";
import type { RenderedFile } from "#modules/names/types.js";

/** The operation's description, then each refusal the runtime makes for a rule and why, in the rule's one sentence (G5): an agent reads it before it calls. */
const toolDescription = (model: Model, o: Model["operations"][string]) =>
  [o.description, ...Object.keys(o.invariants ?? {}).flatMap((r) => { const rule = ruleBehind(model, o, r); return rule ? [`Refuses ${r} when ${rule.sentence}.`] : []; })].join(" ");

export const renderMcp = (model: Model): ReadonlyArray<RenderedFile> => {
  // MCP is the agent's way in: an operation a mount narrowed without Via.agent has no tool (M1-plugins section 3). The catalog is what the
  // server can serve; which of it an agent is shown follows `allowed` at run time (`Mcp.tools`, and the model's `agentTool`).
  const ops = Object.values(model.operations).filter((o) => o.via === undefined || o.via.includes("agent"));
  return [{
    path: "generated/mcp/src/index.ts",
    scaffold: false,
    content: lines(
      GENERATED,
      `import type { McpEntry } from "${Names.pkg("language-effect")}";`,
      ops.map((o) => `import { declaration as ${opVar(o)} } from "../../api/src/${o.thing}/${o.verb}.ts";`),
      "",
      "/** One tool per operation and read, named as the operation is. */",
      "export const catalog = {",
      ops.map((o) => {
        const states = model.things[o.thing]?.machine?.states ?? [];
        return `  "${o.name}": { description: ${JSON.stringify(toolDescription(model, o))}, operation: ${opVar(o)}${states.length > 0 ? `, states: ${JSON.stringify(states)}` : ""}${o.move ? `, move: ${JSON.stringify(o.move)}` : ""} },`;
      }),
      "} as const satisfies { readonly [name: string]: McpEntry };",
    ),
  }];
};
