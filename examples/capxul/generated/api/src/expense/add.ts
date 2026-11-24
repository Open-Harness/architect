// Generated from blueprint/things/expense/verbs/add.ts. Do not edit.
import { HttpApiEndpoint } from "effect/http-api";
import { wireStruct } from "orthograph/server";
import declaration from "../../../../blueprint/things/expense/verbs/add.ts";
import { SanctionedOverClaimed, ExpenseTypeNotInCompany, ClaimNotDraft, ExpenseClaimTypeNotFound, NotAllowed, IdempotencyConflict } from "../errors.ts";

export { declaration };
export const endpoint = HttpApiEndpoint.post("add", "/expense/add", {
  payload: declaration.payloadSchema,
  // What the wire carries: the declared answer, the fields not every caller is shown optional. The server cuts each answer by who is asking.
  // Typed as the declaration types it: the schema is built from fields known only at run time, which TypeScript cannot follow.
  success: wireStruct(declaration.answer, { issuing: true }) as unknown as typeof declaration.answerSchema,
  error: [SanctionedOverClaimed, ExpenseTypeNotInCompany, ClaimNotDraft, ExpenseClaimTypeNotFound, NotAllowed, IdempotencyConflict],
});
