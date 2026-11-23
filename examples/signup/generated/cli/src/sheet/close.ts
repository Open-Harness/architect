// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/sheet/close.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Take a sheet down. Nobody can join it after this. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const close = Command.make(
  "close",
  { sheet: Flag.String("sheet").pipe(Flag.withMetavar("id"), Flag.withDescription("Sheet id: an id (sht_...).")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.sheet.close), Output.answer(json)),
).pipe(Command.withDescription("Take a sheet down. Nobody can join it after this. Moves a sheet from open or full to closed."));
