// The declaration constructors of M3-workflows section 1. They only record what was declared: the run is
// `@orthograph/workflows`, and the compiler's knowledge of `blueprint/workflows/` is Goal 3's (M3-workflows section 6).
import type { WorkflowsApi } from "./types.ts";

export const Workflows: WorkflowsApi = {
  workflow: (spec) => Object.freeze({ kind: "workflow", ...spec }),
  activity: {
    call: (operation) => Object.freeze({ kind: "call", operation }),
    await: (event, options) => Object.freeze({ kind: "await", event, within: options?.within }),
    after: (span) => Object.freeze({ kind: "after", when: span }),
    at: (instant) => Object.freeze({ kind: "at", when: instant }),
  },
};
