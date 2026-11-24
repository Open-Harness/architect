// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/bridge-individual/start.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Start your own KYC with Bridge: answers the form you fill in, and Bridge's terms. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const start = Command.make(
  "start",
  { fullName: Flag.String("fullName").pipe(Flag.withMetavar("legal-name"), Flag.withDescription("The person's name as their documents give it, which Bridge checks. Text of up to 140 characters.")), email: Flag.String("email").pipe(Flag.withMetavar("text"), Flag.withDescription("Where Bridge writes to the person about their KYC. Text of up to 254 characters.")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.bridgeIndividual.start), Output.answer(json)),
).pipe(Command.withDescription("Start your own KYC with Bridge: answers the form you fill in, and Bridge's terms. Creates a bridge individual, which starts started."));
