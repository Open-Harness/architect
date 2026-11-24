// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/outgoing-message/withdraw.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Drop a ticket's pending replies: it ended, or its superagent retired. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const withdraw = Command.make(
  "withdraw",
  { ticket: Flag.String("ticket").pipe(Flag.withMetavar("id"), Flag.withDescription("Outgoing message ticket: an id (tkt_...).")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.outgoingMessage.withdraw), Output.answer(json)),
).pipe(Command.withDescription("Drop a ticket's pending replies: it ended, or its superagent retired. Moves an outgoing message from pending to dropped."));
