import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { CfWorkerJsonSchemaValidator } from "@modelcontextprotocol/sdk/validation/cfworker";
import { CallToolRequestSchema, ErrorCode, ListToolsRequestSchema, McpError } from "@modelcontextprotocol/sdk/types.js";
import { admitsAgent } from "orthograph";
import type { McpApi } from "./types.ts";
import { toolOf } from "./internal/tool.ts";

export const Mcp: McpApi = {
  // Every tool of the catalog is served: a call is judged by `allowed`, so an agent that names a tool it is not shown is refused NotAllowed.
  tools: ({ catalog, served, refusals }) =>
    Object.entries(catalog).map(([name, entry]) => ({ ...toolOf(name, entry, served[name]!, refusals), agentTool: admitsAgent(entry.operation.allowed) })),

  handle: ({ name, version, tools, principal, run }, request) => {
    // Stateless: a server for this one request, no session id, no Durable Object, answered as plain JSON.
    const server = new Server({ name, version }, { capabilities: { tools: {} }, jsonSchemaValidator: new CfWorkerJsonSchemaValidator() });
    // An agent is shown the tools some `allowed` entry admits one to (M2-auth, fork 2): consent and a new credential are a person's own.
    const shown = principal.kind === "agent" ? tools.filter((t) => t.agentTool !== false) : tools;
    server.setRequestHandler(ListToolsRequestSchema, () => ({
      tools: shown.map((t) => ({
        name: t.name,
        description: t.description,
        inputSchema: t.input as { type: "object" },
        ...(t.move ? { _meta: { move: t.move } } : {}),
        ...(t.output ? { outputSchema: t.output as { type: "object" } } : {}),
        ...(t.readOnly ? { annotations: { readOnlyHint: true } } : {}),
      })),
    }));
    server.setRequestHandler(CallToolRequestSchema, (call) => {
      const tool = tools.find((t) => t.name === call.params.name);
      if (!tool) return Promise.reject(new McpError(ErrorCode.InvalidParams, `no tool ${call.params.name}`));
      return run(tool.call(call.params.arguments ?? {}, principal)).then((r) => ({
        isError: r.isError,
        content: [{ type: "text" as const, text: r.text }],
        ...(r.structured ? { structuredContent: r.structured as { [field: string]: unknown } } : {}),
      }));
    });
    const transport = new WebStandardStreamableHTTPServerTransport({ enableJsonResponse: true });
    return server.connect(transport).then(() => transport.handleRequest(request));
  },
};
