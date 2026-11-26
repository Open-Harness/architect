// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/leave-application/reject.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Reject a leave, marking none of its days. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const reject = Command.make(
  "reject",
  { leaveApplication: Flag.String("leaveApplication").pipe(Flag.withMetavar("id"), Flag.withDescription("Leave application id: an id (lap_...).")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.leaveApplication.reject), Output.answer(json)),
).pipe(Command.withDescription("Reject a leave, marking none of its days. Moves a leave application from open to rejected."));
