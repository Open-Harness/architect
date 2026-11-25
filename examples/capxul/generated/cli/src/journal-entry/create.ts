// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/journal-entry/create.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Draft a journal entry with its lines. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const create = Command.make(
  "create",
  { company: Flag.String("company").pipe(Flag.withMetavar("id"), Flag.withDescription("Journal entry company: an id (com_...).")), postingDate: Flag.String("postingDate").pipe(Flag.withMetavar("day"), Flag.withDescription("Journal entry posting date: text.")), userRemark: Flag.String("userRemark").pipe(Flag.withMetavar("remark"), Flag.withDescription("Journal entry user remark: text of up to 1000 characters.")), lines: Flag.String("lines").pipe(Flag.withMetavar("text"), Flag.withDescription("Its lines, in order: each an account, a cost center, and a debit or a credit. At most 50. Text.")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.journalEntry.create), Output.answer(json)),
).pipe(Command.withDescription("Draft a journal entry with its lines. Creates a journal entry, which starts draft."));
