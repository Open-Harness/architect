// Blank until M3.28: nothing is registered, so every check that needs a run or a refusal is red. A blank is a defect,
// never a quiet success.
import { Effect, Layer } from "effect";
import type { WorkflowsApi } from "./types.ts";
import { WorkflowEvents } from "./types.ts";

const blank = (what: string) => Effect.die(new Error(`@orthograph/workflows: ${what} is not built yet (M3.28)`));

export const Workflows: WorkflowsApi = {
  register: () => blank("Workflows.register"),
  layer: () => Layer.effect(WorkflowEvents)(blank("Workflows.layer")),
};
