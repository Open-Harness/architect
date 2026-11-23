// Generated from blueprint/things/handle/verbs/resolve.ts. Do not edit.
import { definePrimitive } from "@ui-sdk/core";
import { piece, type PieceOptions } from "@orthograph/web";
import type { options } from "../../actions/handle/resolve.ts";

/** What handle.resolve answers. */
export type HandleResolveAnswer = Awaited<ReturnType<ReturnType<typeof options>["run"]>>;

/** Find the handle that holds a claimed name. A released or unclaimed name has none. */
export const handleResolve = definePrimitive({
  name: "handle-resolve",
  options: { ...piece.readOptions, name: "string" },
  state: (_: PieceOptions<HandleResolveAnswer>) => piece.readState<HandleResolveAnswer>(),
  api: (context) => piece.readApi(context, { fields: ["name"], reloadsOn: ["handle", "link", "profile"] }),
  slots: (slot) => piece.readSlots(slot),
  agent: { actions: ["reload"] },
});
