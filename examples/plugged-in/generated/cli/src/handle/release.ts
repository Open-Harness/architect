// Generated from blueprint/projections/cli.ts. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/handle/release.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Free your name and take its public page offline. Anyone may claim the name afterwards. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const release = Command.make(
  "release",
  { handle: Flag.String("handle").pipe(Flag.withMetavar("id"), Flag.withDescription("The handle's own id. An id (hdl_...).")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.handle.release), Output.answer(json)),
).pipe(Command.withDescription("Free your name and take its public page offline. Anyone may claim the name afterwards. Moves a handle from claimed to released."));
