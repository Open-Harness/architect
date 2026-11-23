// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/run/start.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Start an agent on one task. The run claims the task until it ends. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const start = Command.make(
  "start",
  { mission: Flag.String("mission").pipe(Flag.withMetavar("id"), Flag.withDescription("Run mission: an id (msn_...).")), task: Flag.String("task").pipe(Flag.withMetavar("task-key"), Flag.withDescription("Run task: text of up to 160 characters.")), agent: Flag.String("agent").pipe(Flag.withMetavar("agent-type"), Flag.withDescription("Run agent: text of up to 60 characters.")), model: Flag.String("model").pipe(Flag.withMetavar("model-name"), Flag.withDescription("Run model: text of up to 80 characters.")), budget: Flag.String("budget").pipe(Flag.withMetavar("uint"), Flag.withDescription("Run budget: a whole number below 2^64.")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.run.start), Output.answer(json)),
).pipe(Command.withDescription("Start an agent on one task. The run claims the task until it ends. Creates a run, which starts running."));
