import { Effect } from "effect";
import { Blueprint } from "orthograph";

// @ts-expect-error a projection has no `needs`: only features and adapters do
export const bad = Blueprint.projection({ description: "Docs.", choices: {}, host: [], ships: [], needs: [], render: () => Effect.succeed([]) });
