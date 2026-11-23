// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/bridge-individual/reject.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Record that Bridge turned down a person's KYC, and why. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const reject = Command.make(
  "reject",
  { individual: Flag.String("individual").pipe(Flag.withMetavar("id"), Flag.withDescription("Bridge individual id: an id (kyc_...).")), reason: Flag.String("reason").pipe(Flag.withMetavar("rejection-reason"), Flag.withDescription("A rejection reason: text of up to 500 characters.")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.bridgeIndividual.reject), Output.answer(json)),
).pipe(Command.withDescription("Record that Bridge turned down a person's KYC, and why. Moves a bridge individual from started to rejected."));
