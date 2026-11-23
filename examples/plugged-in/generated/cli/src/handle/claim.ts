// Generated from blueprint/projections/cli.ts. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/handle/claim.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Claim a free name and make it the address of your public page, with its profile. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const claim = Command.make(
  "claim",
  { name: Flag.String("name").pipe(Flag.withMetavar("handle-name"), Flag.withDescription("A name of up to 32 lowercase letters and digits, starting with a letter: the address of a public page. Text.")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.handle.claim), Output.answer(json)),
).pipe(Command.withDescription("Claim a free name and make it the address of your public page, with its profile. Creates a handle, which starts claimed."));
