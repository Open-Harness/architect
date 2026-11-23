// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/attention/approve.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Say yes. For a promote, the promote runs. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const approve = Command.make(
  "approve",
  { mission: Flag.String("mission").pipe(Flag.withMetavar("id"), Flag.withDescription("Attention mission: an id (msn_...).")), attention: Flag.String("attention").pipe(Flag.withMetavar("id"), Flag.withDescription("Attention id: an id (att_...).")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.attention.approve), Output.answer(json)),
).pipe(Command.withDescription("Say yes. For a promote, the promote runs. Moves an attention from open to approved."));
