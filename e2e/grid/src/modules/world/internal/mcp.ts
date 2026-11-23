import { join } from "node:path";
import { Effect } from "effect";
import { Mcp, type McpEntry, type McpRefusals, type McpServed, type McpTool } from "@orthograph/language-effect";
import type { McpToolView } from "../../project-evidence/types.ts";

/** A call is never made: `tools/list` asks the server what it offers, not to run anything. */
const neverRun: McpServed<never> = { run: () => Effect.die("tools/list runs no tool") };

/**
 * What the project's MCP server answers to `tools/list`, as the protocol carries it: the generated catalog and refusals table go
 * through the framework's own `Mcp.tools` and `Mcp.handle`, the same pair `generated/server/main.ts` serves `/mcp` with.
 */
export const toolsList = (project: string, load: (path: string) => Promise<Record<string, unknown>>): Promise<ReadonlyArray<McpToolView> | undefined> =>
  Promise.all([load(join(project, "generated/mcp/src/index.ts")), load(join(project, "generated/api/src/errors.ts"))]).then(([mcp, errors]) => {
    const catalog = mcp["catalog"] as { readonly [name: string]: McpEntry };
    const served = Object.fromEntries(Object.keys(catalog).map((name) => [name, neverRun]));
    const refusals = { codes: errors["codes"], declared: errors["declared"], table: errors["refusals"] } as McpRefusals;
    const tools = Mcp.tools({ catalog, served, refusals });
    const request = new Request("http://mcp.test/mcp", {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
    });
    const principal = { kind: "person", person: "per_grid" } as unknown as Parameters<McpTool<never>["call"]>[1];
    return Mcp.handle({ name: "grid", version: "0", tools, principal, run: (effect) => Promise.reject(effect) }, request)
      .then((response) => response.json())
      .then((body) => (body as { readonly result?: { readonly tools?: ReadonlyArray<McpToolView> } }).result?.tools);
  });
