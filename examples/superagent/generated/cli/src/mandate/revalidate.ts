// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/mandate/revalidate.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Check a ticket's mandate against the policy as it is now, before the ticket resumes. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const revalidate = Command.make(
  "revalidate",
  { ticket: Flag.String("ticket").pipe(Flag.withMetavar("id"), Flag.withDescription("Mandate ticket: an id (tkt_...).")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.mandate.revalidate), Output.answer(json)),
).pipe(Command.withDescription("Check a ticket's mandate against the policy as it is now, before the ticket resumes. Moves a mandate from withdrawn or held to held or revoked."));
