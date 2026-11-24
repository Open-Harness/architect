// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/bridge-business/approve.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Record that Bridge approved a company's KYB. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const approve = Command.make(
  "approve",
  { business: Flag.String("business").pipe(Flag.withMetavar("id"), Flag.withDescription("Bridge business id: an id (kyb_...).")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.bridgeBusiness.approve), Output.answer(json)),
).pipe(Command.withDescription("Record that Bridge approved a company's KYB. Moves a bridge business from started to approved."));
