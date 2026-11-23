// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/sheet/open.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Put up a sheet with a number of places. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const open = Command.make(
  "open",
  { title: Flag.String("title").pipe(Flag.withMetavar("title"), Flag.withDescription("Sheet title: text of up to 120 characters.")), places: Flag.Int("places").pipe(Flag.map(String), Flag.withDescription("Sheet places: a whole number below 2^32.")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.sheet.open), Output.answer(json)),
).pipe(Command.withDescription("Put up a sheet with a number of places. Creates a sheet, which starts open."));
