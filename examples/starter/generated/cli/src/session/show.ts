// Generated from the blueprint. Do not edit.
import { Effect, Option, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration } from "../../../api/src/session/show.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import { answer, refused } from "../output.ts";
import { deviceSignIn, given, withSession } from "./device.ts";

/** Who is signed in. With `--env <env>`, as the person that environment's session belongs to. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const show = Command.make(
  "show",
  { env: Flag.String("env").pipe(Flag.withMetavar("env"), Flag.withDescription("Ask as the person this environment's kept session belongs to."), Flag.optional), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, env, ...flags }) => {
    const run = Schema.decodeUnknownEffect(declaration.payloadSchema)(given(flags)).pipe(Effect.flatMap(Sdk.session.show));
    return Effect.gen(function* () { return Option.isSome(env) ? yield* withSession(env.value)(run) : yield* run; }).pipe(answer(json));
  },
).pipe(Command.withDescription("Who is signed in. With --env <env>, as the person that environment's session belongs to."));
