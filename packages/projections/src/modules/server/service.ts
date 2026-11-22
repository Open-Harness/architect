import { Blueprint, Host, Ships } from "orthograph";
import type { Model } from "@orthograph/compiler";
import { modelOf, serverModel, within } from "#modules/names/service.js";
import type { RenderedFile } from "#modules/names/types.js";
import { renderHandlerTypes } from "#modules/handlers/service.js";
import { renderServer } from "./internal/server.ts";

/**
 * The Worker: every served operation's route wired to its handler, the world's door, the portal, the D1 tables and
 * their migrations, and the types of the handlers that call an adapter (`generated/server/`).
 */
export const server = Blueprint.projection({
  description: "The Worker: each operation's route wired to its handler, the world's door, the portal, and the database's tables.",
  host: [Host.worker],
  ships: [Ships.deploy],
  render: (input) => {
    const served = serverModel(modelOf(input));
    return within(input, "server", [...renderServer(served, input.name), ...renderHandlerTypes(served)]);
  },
});

/** A temporary Worker with the original handlers for setup and scaffolds for journey calls (`ortho prove`, never `generated/`). */
export const emptyServer = (model: Model, name: string): ReadonlyArray<RenderedFile> => renderServer(serverModel(model), name, true);
export { COMPATIBILITY_DATE } from "./internal/worker-config.ts";
