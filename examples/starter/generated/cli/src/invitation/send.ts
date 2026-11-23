// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/invitation/send.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Invite someone to an organisation by email. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const send = Command.make(
  "send",
  { organization: Flag.String("organization").pipe(Flag.withMetavar("id"), Flag.withDescription("Invitation organization: an id (org_...).")), email: Flag.String("email").pipe(Flag.withMetavar("text"), Flag.withDescription("Invitation email: text of up to 254 characters.")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.invitation.send), Output.answer(json)),
).pipe(Command.withDescription("Invite someone to an organisation by email. Creates an invitation, which starts pending."));
