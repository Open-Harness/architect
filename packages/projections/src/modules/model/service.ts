import { Blueprint, Ships } from "orthograph";
import { modelOf, within } from "#modules/names/service.js";
import { renderEdges } from "./internal/edges.ts";

/**
 * The model as data (`generated/model/`): `model.json` is the compiler's model as it is, with its `mounts` when the project
 * mounts anything, and `edges.json` what depends on what. The model is a projection too (M1-plugins, "Checks 12 and 13").
 * `changes.json` beside them is the CLI's, never this projection's.
 */
export const model = Blueprint.projection({
  description: "The model as data: every thing, operation and mount, and what depends on what.",
  host: [],
  ships: [Ships.kept],
  render: (input) => {
    const compiled = modelOf(input);
    return within(input, "model", [
      { path: "generated/model/model.json", content: JSON.stringify(compiled, null, 2) + "\n", scaffold: false },
      renderEdges(compiled),
    ]);
  },
});
