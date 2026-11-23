// Generated from blueprint/things/bridge-business/verbs/reject.ts. Do not edit.
import { HttpApiEndpoint } from "effect/http-api";
import { wireStruct } from "orthograph/server";
import declaration from "../../../../blueprint/things/bridge-business/verbs/reject.ts";
import { KybAlreadyStarted, BridgeBusinessNotStarted, BridgeBusinessNotFound, NotAllowed, IdempotencyConflict } from "../errors.ts";

export { declaration };
export const endpoint = HttpApiEndpoint.post("reject", "/bridge-business/reject", {
  payload: declaration.payloadSchema,
  // What the wire carries: the declared answer, the fields not every caller is shown optional. The server cuts each answer by who is asking.
  // Typed as the declaration types it: the schema is built from fields known only at run time, which TypeScript cannot follow.
  success: wireStruct(declaration.answer, { issuing: true }) as unknown as typeof declaration.answerSchema,
  error: [KybAlreadyStarted, BridgeBusinessNotStarted, BridgeBusinessNotFound, NotAllowed, IdempotencyConflict],
});
