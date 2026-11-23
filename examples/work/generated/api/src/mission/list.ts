// Generated from blueprint/things/mission/verbs/list.ts. Do not edit.
import { HttpApiEndpoint } from "effect/http-api";
import { listItemFields, wireStruct } from "orthograph/server";
import declaration from "../../../../blueprint/things/mission/verbs/list.ts";
import { NotAllowed } from "../errors.ts";

export { declaration };
export const endpoint = HttpApiEndpoint.post("list", "/mission/list", {
  payload: declaration.payloadSchema,
  // What the wire carries: the declared answer, the fields not every caller is shown optional. The server cuts each answer by who is asking.
  // Typed as the declaration types it: the schema is built from fields known only at run time, which TypeScript cannot follow.
  success: wireStruct(declaration.answer, { issuing: true, items: listItemFields(declaration.thing) }) as unknown as typeof declaration.answerSchema,
  error: [NotAllowed],
});
