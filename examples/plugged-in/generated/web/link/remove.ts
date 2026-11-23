// Generated from blueprint/things/link/verbs/remove.ts. Do not edit.
import { definePrimitive } from "@ui-sdk/core";
import { piece, type PieceOptions } from "@orthograph/web";
import type { options } from "../../actions/link/remove.ts";

/** What link.remove answers. */
export type LinkRemoveAnswer = Awaited<ReturnType<ReturnType<typeof options>["run"]>>;

/** Remove a link from a public page. */
export const linkRemove = definePrimitive({
  name: "link-remove",
  options: { ...piece.options, link: "string" },
  state: (_: PieceOptions<LinkRemoveAnswer>) => piece.state<LinkRemoveAnswer>(),
  api: (context) => piece.api(context, { fields: [], subject: ["link"] }),
  slots: (slot) => piece.slots(slot),
  agent: { actions: ["submit"] },
});
