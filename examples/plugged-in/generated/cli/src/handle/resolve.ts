// Generated from blueprint/projections/cli.ts. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/handle/resolve.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Find the handle that holds a claimed name. A released or unclaimed name has none. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const resolve = Command.make(
  "resolve",
  { name: Flag.String("name").pipe(Flag.withMetavar("handle-name"), Flag.withDescription("A name of up to 32 lowercase letters and digits, starting with a letter: the address of a public page. Text.")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.handle.resolve), Output.answer(json)),
).pipe(Command.withDescription("Find the handle that holds a claimed name. A released or unclaimed name has none."));
