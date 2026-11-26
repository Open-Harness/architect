// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/superagent/reap.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Close the running Assignments whose executor is idle, so their seats come back once the Agent has said it closed. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const reap = Command.make(
  "reap",
  { superagent: Flag.String("superagent").pipe(Flag.withMetavar("id"), Flag.withDescription("Superagent id: an id (sag_...).")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.superagent.reap), Output.answer(json)),
).pipe(Command.withDescription("Close the running Assignments whose executor is idle, so their seats come back once the Agent has said it closed."));
