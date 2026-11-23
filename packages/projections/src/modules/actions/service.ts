import { Blueprint, Host, Ships } from "orthograph";
import { modelOf, serverModel, within } from "#modules/names/service.js";
import { renderActions } from "./internal/actions.ts";

/**
 * The actions (`generated/actions/`): one module per operation exporting `options(host)`, an agent-native action's fields read from
 * the model, whose `run` is the SDK's own call made through the host. It never calls `defineAction`.
 */
export const actions = Blueprint.projection({
  description: "The actions: a module per operation, its name, flags, refusals and schema from the model, its run the SDK's call through the host.",
  host: [Host.node, Host.browser],
  ships: [Ships.release],
  render: (input) => within(input, "actions", renderActions(serverModel(modelOf(input)), input.name)),
});
