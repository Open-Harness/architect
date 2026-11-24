// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/bridge-individual/approve.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Record that Bridge approved a person's KYC. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const approve = Command.make(
  "approve",
  { individual: Flag.String("individual").pipe(Flag.withMetavar("id"), Flag.withDescription("Bridge individual id: an id (kyc_...).")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.bridgeIndividual.approve), Output.answer(json)),
).pipe(Command.withDescription("Record that Bridge approved a person's KYC. Moves a bridge individual from started to approved."));
