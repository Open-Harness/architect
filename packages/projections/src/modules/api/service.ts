import { Blueprint, Ships } from "orthograph";
import { modelOf, serverModel, within } from "#modules/names/service.js";
import { renderApi } from "./internal/api.ts";

/**
 * The contract: an endpoint built from each operation's own declaration, the wire errors, the events and the handler type
 * (`generated/api/`). An operation that runs on the device has its declaration there and no route.
 */
export const api = Blueprint.projection({
  description: "The API contract: each operation's endpoint, built from its own declaration, with the wire errors, the events and the handler's type.",
  host: [],
  ships: [Ships.kept],
  render: (input) => {
    const model = modelOf(input);
    return within(input, "api", renderApi(model, input.name, serverModel(model)));
  },
});
