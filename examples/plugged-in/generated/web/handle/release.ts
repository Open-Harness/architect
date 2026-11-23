// Generated from blueprint/things/handle/verbs/release.ts. Do not edit.
import { definePrimitive } from "@ui-sdk/core";
import { piece, type PieceOptions } from "@orthograph/web";
import type { options } from "../../actions/handle/release.ts";

/** What handle.release answers. */
export type HandleReleaseAnswer = Awaited<ReturnType<ReturnType<typeof options>["run"]>>;

/** Free your name and take its public page offline. Anyone may claim the name afterwards. */
export const handleRelease = definePrimitive({
  name: "handle-release",
  options: { ...piece.options, handle: "string" },
  state: (_: PieceOptions<HandleReleaseAnswer>) => piece.state<HandleReleaseAnswer>(),
  api: (context) => piece.api(context, { fields: [], subject: ["handle"] }),
  slots: (slot) => piece.slots(slot),
  agent: { actions: ["submit"] },
});
