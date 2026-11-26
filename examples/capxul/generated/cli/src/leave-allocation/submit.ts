// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/leave-allocation/submit.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Submit an allocation, so its leave days can be taken. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const submit = Command.make(
  "submit",
  { leaveAllocation: Flag.String("leaveAllocation").pipe(Flag.withMetavar("id"), Flag.withDescription("Leave allocation id: an id (lal_...).")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.leaveAllocation.submit), Output.answer(json)),
).pipe(Command.withDescription("Submit an allocation, so its leave days can be taken. Moves a leave allocation from draft to submitted."));
