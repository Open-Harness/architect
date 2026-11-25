// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/leave-type/create.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Add a kind of leave a company gives. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const create = Command.make(
  "create",
  { company: Flag.String("company").pipe(Flag.withMetavar("id"), Flag.withDescription("Leave type company: an id (com_...).")), leaveTypeName: Flag.String("leaveTypeName").pipe(Flag.withMetavar("leave-type-name"), Flag.withDescription("Leave type leave type name: text of up to 140 characters.")), maxContinuousDaysAllowed: Flag.Int("maxContinuousDaysAllowed").pipe(Flag.map(String), Flag.withDescription("Leave type max continuous days allowed: a whole number below 2^32.")), isLwp: Flag.String("isLwp").pipe(Flag.withMetavar("yes-no"), Flag.withDescription("Leave without pay: never allocated, and taken with no balance. Text.")), includeHoliday: Flag.String("includeHoliday").pipe(Flag.withMetavar("yes-no"), Flag.withDescription("Holidays inside a leave count as leave days. Text.")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.leaveType.create), Output.answer(json)),
).pipe(Command.withDescription("Add a kind of leave a company gives. Creates a leave type, which starts active."));
