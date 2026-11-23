import { Blueprint, Host, Ships } from "orthograph";
import { modelOf, serverModel, within } from "#modules/names/service.js";
import { renderWeb } from "./internal/web.ts";

/**
 * The web pieces (`generated/web/`): for each operation a UI SDK primitive and its React parts, and one file giving them the app's
 * host. Read from the model alone: a read, a move or a write is told by its steps, an input by its payload field, a yes by `needsApproval`.
 */
export const web = Blueprint.projection({
  description: "The web pieces: a UI SDK primitive and its React parts for each operation, bound to its generated action.",
  host: [Host.browser],
  ships: [Ships.release],
  render: (input) => within(input, "web", renderWeb(serverModel(modelOf(input)), input.name)),
});
