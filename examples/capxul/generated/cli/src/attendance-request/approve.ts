// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/attendance-request/approve.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Approve a request, marking each of its days. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const approve = Command.make(
  "approve",
  { attendanceRequest: Flag.String("attendanceRequest").pipe(Flag.withMetavar("id"), Flag.withDescription("Attendance request id: an id (arq_...).")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.attendanceRequest.approve), Output.answer(json)),
).pipe(Command.withDescription("Approve a request, marking each of its days. Moves an attendance request from draft to approved."));
