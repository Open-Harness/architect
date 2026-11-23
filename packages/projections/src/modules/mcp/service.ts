import { Blueprint, Ships } from "orthograph";
import { modelOf, serverModel, within } from "#modules/names/service.js";
import { renderMcp } from "./internal/mcp.ts";

/**
 * The remote MCP server's catalog (`generated/mcp/`): a tool for each operation and read an agent can reach, and none for
 * what runs on the device or what a mount narrowed out of `Via.agent`.
 */
export const mcp = Blueprint.projection({
  description: "The MCP catalog: a tool for each operation an agent can reach, named as the operation is.",
  host: [],
  ships: [Ships.kept],
  render: (input) => within(input, "mcp", renderMcp(serverModel(modelOf(input)))),
});
