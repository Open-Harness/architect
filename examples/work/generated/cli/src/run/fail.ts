// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/run/fail.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** The run gave up, saying why. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const fail = Command.make(
  "fail",
  { mission: Flag.String("mission").pipe(Flag.withMetavar("id"), Flag.withDescription("Run mission: an id (msn_...).")), run: Flag.String("run").pipe(Flag.withMetavar("id"), Flag.withDescription("Run id: an id (run_...).")), why: Flag.String("why").pipe(Flag.withMetavar("note"), Flag.withDescription("A note: text of up to 4000 characters.")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.run.fail), Output.answer(json)),
).pipe(Command.withDescription("The run gave up, saying why. Moves a run from running or waiting to failed."));
