// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/api-key/create.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Create an API key in an organisation. The key itself is shown once. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const create = Command.make(
  "create",
  { organization: Flag.String("organization").pipe(Flag.withMetavar("id"), Flag.withDescription("Api key organization: an id (org_...).")), name: Flag.String("name").pipe(Flag.withMetavar("text"), Flag.withDescription("Api key name: text of up to 200 characters.")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.apiKey.create), Output.answer(json)),
).pipe(Command.withDescription("Create an API key in an organisation. The key itself is shown once."));
