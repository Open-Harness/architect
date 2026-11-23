// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/run/finish.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** The run pushed its branch. CI proves it; the run cannot close its own task. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const finish = Command.make(
  "finish",
  { mission: Flag.String("mission").pipe(Flag.withMetavar("id"), Flag.withDescription("Run mission: an id (msn_...).")), run: Flag.String("run").pipe(Flag.withMetavar("id"), Flag.withDescription("Run id: an id (run_...).")), branch: Flag.String("branch").pipe(Flag.withMetavar("branch"), Flag.withDescription("A branch: text of up to 200 characters.")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.run.finish), Output.answer(json)),
).pipe(Command.withDescription("The run pushed its branch. CI proves it; the run cannot close its own task. Moves a run from running to finished."));
