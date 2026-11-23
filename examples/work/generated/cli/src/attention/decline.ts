// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/attention/decline.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Say not yet, and why. The task stays where its facts put it. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const decline = Command.make(
  "decline",
  { mission: Flag.String("mission").pipe(Flag.withMetavar("id"), Flag.withDescription("Attention mission: an id (msn_...).")), attention: Flag.String("attention").pipe(Flag.withMetavar("id"), Flag.withDescription("Attention id: an id (att_...).")), why: Flag.String("why").pipe(Flag.withMetavar("note"), Flag.withDescription("A note: text of up to 4000 characters.")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.attention.decline), Output.answer(json)),
).pipe(Command.withDescription("Say not yet, and why. The task stays where its facts put it. Moves an attention from open to declined."));
