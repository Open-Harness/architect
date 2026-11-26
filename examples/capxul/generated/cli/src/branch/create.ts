// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/branch/create.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Add a branch to a company. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const create = Command.make(
  "create",
  { company: Flag.String("company").pipe(Flag.withMetavar("id"), Flag.withDescription("Branch company: an id (com_...).")), branchName: Flag.String("branchName").pipe(Flag.withMetavar("name"), Flag.withDescription("Branch branch name: text of up to 140 characters.")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.branch.create), Output.answer(json)),
).pipe(Command.withDescription("Add a branch to a company. Creates a branch, which starts active."));
