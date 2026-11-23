import { Blueprint, Host, Ships } from "orthograph";
import { modelOf, within } from "#modules/names/service.js";
import { renderSdk } from "./internal/sdk.ts";

/**
 * The typed client (`generated/sdk/`): one function per operation, the caller on the client's layer, a request key kept
 * across retries, and declared refusals as typed failures. The CLI is built on it.
 */
export const sdk = Blueprint.projection({
  description: "The typed client: a function per operation, the caller on its layer, a request key kept across retries, refusals as typed failures.",
  host: [Host.node, Host.browser],
  ships: [Ships.release],
  render: (input) => within(input, "sdk", renderSdk(modelOf(input), input.name)),
});
