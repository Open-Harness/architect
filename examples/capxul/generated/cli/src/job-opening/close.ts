// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/job-opening/close.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Close a job opening to new applicants. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const close = Command.make(
  "close",
  { jobOpening: Flag.String("jobOpening").pipe(Flag.withMetavar("id"), Flag.withDescription("Job opening id: an id (jop_...).")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.jobOpening.close), Output.answer(json)),
).pipe(Command.withDescription("Close a job opening to new applicants. Moves a job opening from open to closed."));
