// Generated from blueprint/projections/cli.ts. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/allowance/revoke.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Stop an allowance. Nothing more can be spent from it. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const revoke = Command.make(
  "revoke",
  { allowance: Flag.String("allowance").pipe(Flag.withMetavar("id"), Flag.withDescription("Allowance id: an id (alw_...).")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.allowance.revoke), Output.answer(json)),
).pipe(Command.withDescription("Stop an allowance. Nothing more can be spent from it. Moves an allowance from active or exhausted to revoked."));
