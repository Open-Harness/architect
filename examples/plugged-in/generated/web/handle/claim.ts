// Generated from blueprint/things/handle/verbs/claim.ts. Do not edit.
import { definePrimitive } from "@ui-sdk/core";
import { piece, type PieceOptions } from "@orthograph/web";
import type { options } from "../../actions/handle/claim.ts";

/** What handle.claim answers. */
export type HandleClaimAnswer = Awaited<ReturnType<ReturnType<typeof options>["run"]>>;

/** Claim a free name and make it the address of your public page, with its profile. */
export const handleClaim = definePrimitive({
  name: "handle-claim",
  options: { ...piece.options },
  state: (_: PieceOptions<HandleClaimAnswer>) => piece.state<HandleClaimAnswer>(),
  api: (context) => piece.api(context, { fields: ["name"] }),
  slots: (slot) => piece.slots(slot),
  agent: { actions: ["submit"] },
});
