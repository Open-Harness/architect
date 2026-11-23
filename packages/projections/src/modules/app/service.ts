import { Blueprint, Ships } from "orthograph";
import { modelOf, within } from "#modules/names/service.js";
import { renderApp } from "./internal/render.ts";
import { viewOf } from "./internal/view.ts";

/**
 * The app's map as data (`generated/app/`): the route table, a typed link per page, the navigation, the palette's index and the
 * agent's map. From the declared map (`model.app`), or, with none, the one derived from the things and never written into the model.
 */
export const app = Blueprint.projection({
  description: "The app's map as data: routes, navigation, the palette's index, the agent's map, and a typed link per page.",
  host: [],
  ships: [Ships.kept],
  render: (input) => {
    const model = modelOf(input);
    return within(input, "app", renderApp(viewOf(model, input.name), model));
  },
});
