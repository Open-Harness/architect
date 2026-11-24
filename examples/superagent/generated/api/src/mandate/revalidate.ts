// Generated from @orthograph/tickets/blueprint/things/mandate/verbs/revalidate.ts. Do not edit.
import { HttpApiEndpoint } from "effect/http-api";
import { wireStruct } from "orthograph/server";
import declaration from "@orthograph/tickets/blueprint/things/mandate/verbs/revalidate.ts";
import { MandateNotHeld, TicketNotFound, NotAllowed } from "../errors.ts";

export { declaration };
export const endpoint = HttpApiEndpoint.post("revalidate", "/mandate/revalidate", {
  payload: declaration.payloadSchema,
  // What the wire carries: the declared answer, the fields not every caller is shown optional. The server cuts each answer by who is asking.
  // Typed as the declaration types it: the schema is built from fields known only at run time, which TypeScript cannot follow.
  success: wireStruct(declaration.answer, { issuing: true }) as unknown as typeof declaration.answerSchema,
  error: [MandateNotHeld, TicketNotFound, NotAllowed],
});
