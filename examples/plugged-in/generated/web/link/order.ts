// Generated from blueprint/things/link/verbs/order.ts. Do not edit.
import { definePrimitive } from "@ui-sdk/core";
import { piece, type PieceOptions } from "@orthograph/web";
import type { options } from "../../actions/link/order.ts";

/** What link.order answers. */
export type LinkOrderAnswer = Awaited<ReturnType<ReturnType<typeof options>["run"]>>;

/** Move a link to a zero-based position. A position past the end puts it last. */
export const linkOrder = definePrimitive({
  name: "link-order",
  options: { ...piece.options, link: "string" },
  state: (_: PieceOptions<LinkOrderAnswer>) => piece.state<LinkOrderAnswer>(),
  api: (context) => piece.api(context, { fields: ["position"], subject: ["link"] }),
  slots: (slot) => piece.slots(slot),
  agent: { actions: ["submit"] },
});
