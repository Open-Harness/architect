// Scaffolded from blueprint/workflows/publish.ts. Yours from now on.
// Blank until M3.28: `e2e/workflows` is red on it. The body to write is `design/decisions/M3-workflows.md`, section 1: freeze,
// propose, `seen` (None: withdraw), the cooldown, then link with the proposal and who opened it.
import { Effect } from "effect";
import type { WorkflowHandler } from "orthograph";
import type Publish from "../../blueprint/workflows/publish.ts";

export const publish: WorkflowHandler<typeof Publish> = () => Effect.die(new Error("workflows/publish: not written yet (M3.28)"));
