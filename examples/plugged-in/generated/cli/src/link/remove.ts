// Generated from blueprint/projections/cli.ts. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/link/remove.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Remove a link from a public page. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const remove = Command.make(
  "remove",
  { link: Flag.String("link").pipe(Flag.withMetavar("id"), Flag.withDescription("The link's own id. An id (lnk_...).")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.link.remove), Output.answer(json)),
).pipe(Command.withDescription("Remove a link from a public page. Moves a link from listed to removed."));
