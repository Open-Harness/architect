// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/sheet/join.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Take places on a sheet, for yourself and anyone with you. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const join = Command.make(
  "join",
  { sheet: Flag.String("sheet").pipe(Flag.withMetavar("id"), Flag.withDescription("Sheet id: an id (sht_...).")), people: Flag.Int("people").pipe(Flag.map(String), Flag.withDescription("A count: a whole number below 2^32.")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.sheet.join), Output.answer(json)),
).pipe(Command.withDescription("Take places on a sheet, for yourself and anyone with you. Moves a sheet from open to open or full."));
