import { Blueprint, Ships } from "orthograph";
import { modelOf, within } from "#modules/names/service.js";
import { renderStack } from "./internal/stack.ts";

/**
 * The Alchemy stack of an environment's cloud resources (`generated/infra/`): the Worker, its D1 databases and its
 * Durable Object namespaces, from the model. Kept in the repository; `ortho env up|destroy staging` runs it.
 */
export const infra = Blueprint.projection({
  description: "The Alchemy stack: the Worker, its databases and its Durable Object namespaces, named by the environment's plan.",
  host: [],
  ships: [Ships.kept],
  render: (input) => within(input, "infra", [renderStack(modelOf(input), input.name)]),
});
