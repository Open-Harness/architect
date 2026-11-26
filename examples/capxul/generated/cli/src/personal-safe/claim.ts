// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/personal-safe/claim.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Claim your Safe with the key you sign with, proving you hold it. This works out its address; nothing is sent to the chain. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const claim = Command.make(
  "claim",
  { safe: Flag.String("safe").pipe(Flag.withMetavar("id"), Flag.withDescription("Personal safe id: an id (saf_...).")), signer: Flag.String("signer").pipe(Flag.withMetavar("evm-address"), Flag.withDescription("The key you sign with, which becomes the Safe's one owner. Text.")), proof: Flag.String("proof").pipe(Flag.withMetavar("personal-signature"), Flag.withDescription("Your signer's personal_sign of \"Capxul: claim Safe <safe> for <you>\". Text.")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.personalSafe.claim), Output.answer(json)),
).pipe(Command.withDescription("Claim your Safe with the key you sign with, proving you hold it. This works out its address; nothing is sent to the chain. Moves a personal safe from unclaimed to claimed."));
