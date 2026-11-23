// Generated from blueprint/projections/cli.ts. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/link/order.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Move a link to a zero-based position. A position past the end puts it last. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const order = Command.make(
  "order",
  { link: Flag.String("link").pipe(Flag.withMetavar("id"), Flag.withDescription("The link's own id. An id (lnk_...).")), position: Flag.Int("position").pipe(Flag.map(String), Flag.withDescription("Its place in the page's list of links: 0 is first. A whole number below 2^32.")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.link.order), Output.answer(json)),
).pipe(Command.withDescription("Move a link to a zero-based position. A position past the end puts it last."));
