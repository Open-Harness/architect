// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/employee-separation/complete.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Mark a separation completed. The employee is relieved by its own call. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const complete = Command.make(
  "complete",
  { employeeSeparation: Flag.String("employeeSeparation").pipe(Flag.withMetavar("id"), Flag.withDescription("Employee separation id: an id (esp_...).")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.employeeSeparation.complete), Output.answer(json)),
).pipe(Command.withDescription("Mark a separation completed. The employee is relieved by its own call. Moves an employee separation from pending or inProcess to completed."));
