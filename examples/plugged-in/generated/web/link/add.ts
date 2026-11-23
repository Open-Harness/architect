// Generated from blueprint/things/link/verbs/add.ts. Do not edit.
import { definePrimitive } from "@ui-sdk/core";
import { piece, type PieceOptions } from "@orthograph/web";
import type { options } from "../../actions/link/add.ts";

/** What link.add answers. */
export type LinkAddAnswer = Awaited<ReturnType<ReturnType<typeof options>["run"]>>;

/** Append a link to your own public page. You need a claimed name first. */
export const linkAdd = definePrimitive({
  name: "link-add",
  options: { ...piece.options },
  state: (_: PieceOptions<LinkAddAnswer>) => piece.state<LinkAddAnswer>(),
  api: (context) => piece.api(context, { fields: ["title", "url"] }),
  slots: (slot) => piece.slots(slot),
  agent: { actions: ["submit"] },
});
