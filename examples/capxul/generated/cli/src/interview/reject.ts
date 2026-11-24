// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/interview/reject.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Mark an interview rejected. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const reject = Command.make(
  "reject",
  { interview: Flag.String("interview").pipe(Flag.withMetavar("id"), Flag.withDescription("Interview id: an id (ivw_...).")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.interview.reject), Output.answer(json)),
).pipe(Command.withDescription("Mark an interview rejected. Moves an interview from pending to rejected."));
