// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/attention/raise.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Ask the mission's owner for a decision only they can make. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const raise = Command.make(
  "raise",
  { mission: Flag.String("mission").pipe(Flag.withMetavar("id"), Flag.withDescription("Attention mission: an id (msn_...).")), kind: Flag.String("kind").pipe(Flag.withMetavar("attention-kind"), Flag.withDescription("Attention kind: text.")), title: Flag.String("title").pipe(Flag.withMetavar("title"), Flag.withDescription("Attention title: text of up to 200 characters.")), why: Flag.String("why").pipe(Flag.withMetavar("note"), Flag.withDescription("Attention why: text of up to 4000 characters.")), task: Flag.String("task").pipe(Flag.withMetavar("task-key"), Flag.withDescription("Attention task: text of up to 160 characters.")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.attention.raise), Output.answer(json)),
).pipe(Command.withDescription("Ask the mission's owner for a decision only they can make. Creates an attention, which starts open."));
