// Generated from blueprint/projections/cli.ts. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/invitation/accept.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Accept an invitation and become a member of its organisation. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const accept = Command.make(
  "accept",
  { invitation: Flag.String("invitation").pipe(Flag.withMetavar("id"), Flag.withDescription("Invitation id: an id (inv_...).")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.invitation.accept), Output.answer(json)),
).pipe(Command.withDescription("Accept an invitation and become a member of its organisation. Moves an invitation from pending to accepted."));
