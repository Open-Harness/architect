import { Effect } from "effect";
import type { RolesApi } from "./types.ts";

// Empty handlers until the build (#1163): the checks are roles.test.ts, budget.test.ts and deploy.test.ts.
export const Roles: RolesApi = {
  deploy: () => Effect.die("Roles.deploy is not built (#1163)"),
  budgetCalls: () => Effect.die("Roles.budgetCalls is not built (#1163)"),
  execTransactionWithRole: () => Effect.die("Roles.execTransactionWithRole is not built (#1163)"),
  allowance: () => Effect.die("Roles.allowance is not built (#1163)"),
  accrued: () => -1n,
  refusals: [],
  refusalOf: () => undefined,
};
