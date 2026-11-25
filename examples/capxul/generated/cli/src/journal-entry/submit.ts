// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/journal-entry/submit.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Submit a balanced journal entry, posting one ledger line per line. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const submit = Command.make(
  "submit",
  { journalEntry: Flag.String("journalEntry").pipe(Flag.withMetavar("id"), Flag.withDescription("Journal entry id: an id (jen_...).")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.journalEntry.submit), Output.answer(json)),
).pipe(Command.withDescription("Submit a balanced journal entry, posting one ledger line per line. Moves a journal entry from draft to submitted."));
