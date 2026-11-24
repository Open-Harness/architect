// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/outgoing-message/retry.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Queue a failed reply again, once its wait has passed. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const retry = Command.make(
  "retry",
  { message: Flag.String("message").pipe(Flag.withMetavar("id"), Flag.withDescription("Outgoing message id: an id (msg_...).")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.outgoingMessage.retry), Output.answer(json)),
).pipe(Command.withDescription("Queue a failed reply again, once its wait has passed. Moves an outgoing message from pending to pending."));
