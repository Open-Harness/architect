// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/goal/create.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Set an employee a goal in a cycle, under a KRA, perhaps under another of their goals. Each flag is handed on as text; the declaration decodes it; a flag left out is not sent. `--json` prints the whole answer as JSON. */
export const create = Command.make(
  "create",
  { employee: Flag.String("employee").pipe(Flag.withMetavar("id"), Flag.withDescription("Goal employee: an id (emp_...).")), appraisalCycle: Flag.String("appraisalCycle").pipe(Flag.withMetavar("id"), Flag.withDescription("Goal appraisal cycle: an id (apc_...).")), kra: Flag.String("kra").pipe(Flag.withMetavar("id"), Flag.withDescription("Goal kra: an id (kra_...).")), goalName: Flag.String("goalName").pipe(Flag.withMetavar("goal-name"), Flag.withDescription("Goal goal name: text of up to 140 characters.")), progress: Flag.String("progress").pipe(Flag.withMetavar("progress"), Flag.withDescription("Goal progress: text.")), isGroup: Flag.String("isGroup").pipe(Flag.withMetavar("text"), Flag.withDescription("Whether the goal holds other goals, its progress following theirs (HRMS's `is_group`). Text.")), parentGoal: Flag.optional(Flag.String("parentGoal").pipe(Flag.withMetavar("id"), Flag.withDescription("Goal parent goal: an id (gol_...)."))), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(Output.supplied(flags)).pipe(Effect.flatMap(Sdk.goal.create), Output.answer(json)),
).pipe(Command.withDescription("Set an employee a goal in a cycle, under a KRA, perhaps under another of their goals. Creates a goal, which starts pending or inProgress or completed."));
