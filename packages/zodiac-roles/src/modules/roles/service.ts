import { Effect } from "effect";
import type { RolesApi } from "./types.ts";

// Empty handlers until the build (#1163): the checks are roles.test.ts, budget-calls.test.ts and budget.test.ts.
export const ZodiacRoles: RolesApi = {
  deploy: () => Effect.die("ZodiacRoles.deploy is not built (#1163)"),
  budgetCalls: () => Effect.die("ZodiacRoles.budgetCalls is not built (#1163)"),
  execTransactionWithRole: () => Effect.die("ZodiacRoles.execTransactionWithRole is not built (#1163)"),
  allowance: () => Effect.die("ZodiacRoles.allowance is not built (#1163)"),
  accrued: () => -1n,
  refusals: [],
  refusalOf: () => undefined,
};
