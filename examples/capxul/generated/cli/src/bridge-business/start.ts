// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/bridge-business/start.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Start a company's KYB with Bridge: answers the form the business fills in, and Bridge's terms. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const start = Command.make(
  "start",
  { company: Flag.String("company").pipe(Flag.withMetavar("id"), Flag.withDescription("Bridge business company: an id (com_...).")), legalName: Flag.String("legalName").pipe(Flag.withMetavar("legal-name"), Flag.withDescription("The company's name as it is registered, which Bridge checks. Text of up to 140 characters.")), email: Flag.String("email").pipe(Flag.withMetavar("text"), Flag.withDescription("Where Bridge writes to the business about its KYB. Text of up to 254 characters.")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.bridgeBusiness.start), Output.answer(json)),
).pipe(Command.withDescription("Start a company's KYB with Bridge: answers the form the business fills in, and Bridge's terms. Creates a bridge business, which starts started."));
