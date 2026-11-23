// Generated from blueprint/things/profile/verbs/get.ts. Do not edit.
import { definePrimitive } from "@ui-sdk/core";
import { piece, type PieceOptions } from "@orthograph/web";
import type { options } from "../../actions/profile/get.ts";

/** What profile.get answers. */
export type ProfileGetAnswer = Awaited<ReturnType<ReturnType<typeof options>["run"]>>;

/** Read a claimed name's public page and its links in display order. */
export const profileGet = definePrimitive({
  name: "profile-get",
  options: { ...piece.readOptions, handle: "string" },
  state: (_: PieceOptions<ProfileGetAnswer>) => piece.readState<ProfileGetAnswer>(),
  api: (context) => piece.readApi(context, { fields: ["handle"], reloadsOn: ["profile", "link", "handle"] }),
  slots: (slot) => piece.readSlots(slot),
  agent: { actions: ["reload"] },
});
