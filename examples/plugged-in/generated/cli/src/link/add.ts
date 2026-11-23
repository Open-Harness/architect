// Generated from blueprint/projections/cli.ts. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/link/add.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Append a link to your own public page. You need a claimed name first. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const add = Command.make(
  "add",
  { title: Flag.String("title").pipe(Flag.withMetavar("link-title"), Flag.withDescription("What the link shows on the page, up to 120 characters. Text of up to 120 characters.")), url: Flag.String("url").pipe(Flag.withMetavar("link-url"), Flag.withDescription("Where the link goes: a web address starting with http:// or https://, up to 2048 characters. Text.")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.link.add), Output.answer(json)),
).pipe(Command.withDescription("Append a link to your own public page. You need a claimed name first. Creates a link, which starts listed."));
