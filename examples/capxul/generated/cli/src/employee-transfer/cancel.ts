// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/employee-transfer/cancel.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Cancel a submitted transfer, putting back the department it replaced. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const cancel = Command.make(
  "cancel",
  { employeeTransfer: Flag.String("employeeTransfer").pipe(Flag.withMetavar("id"), Flag.withDescription("Employee transfer id: an id (etr_...).")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.employeeTransfer.cancel), Output.answer(json)),
).pipe(Command.withDescription("Cancel a submitted transfer, putting back the department it replaced. Moves an employee transfer from submitted to cancelled."));
