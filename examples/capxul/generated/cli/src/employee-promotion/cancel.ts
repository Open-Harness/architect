// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/employee-promotion/cancel.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Cancel a submitted promotion, putting back the job title it replaced. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const cancel = Command.make(
  "cancel",
  { employeePromotion: Flag.String("employeePromotion").pipe(Flag.withMetavar("id"), Flag.withDescription("Employee promotion id: an id (epr_...).")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.employeePromotion.cancel), Output.answer(json)),
).pipe(Command.withDescription("Cancel a submitted promotion, putting back the job title it replaced. Moves an employee promotion from submitted to cancelled."));
