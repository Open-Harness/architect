// Generated from the blueprint. Do not edit.
import { Effect, Option, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration } from "../../../api/src/session/sign-in.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import { answer, refused } from "../output.ts";
import { deviceSignIn, given, withSession } from "./device.ts";

/** Sign in with email and password. The token is the bearer for every later call. With `--env <env>`, sign in by device code instead: it prints a code and where to approve it, waits, and keeps the session for `session show --env <env>`. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const signIn = Command.make(
  "sign-in",
  { email: Flag.String("email").pipe(Flag.withMetavar("text"), Flag.withDescription("Person email: text of up to 254 characters.")).pipe(Flag.optional), password: Flag.String("password").pipe(Flag.withMetavar("password"), Flag.withDescription("A password: text of up to 128 characters.")).pipe(Flag.optional), env: Flag.String("env").pipe(Flag.withMetavar("env"), Flag.withDescription("Sign in by device code to this environment, and keep the session, instead of with the flags."), Flag.optional), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, env, ...flags }) =>
    Effect.gen(function* () {
      if (Option.isSome(env)) return yield* deviceSignIn(env.value).pipe(refused);
      return yield* Schema.decodeUnknownEffect(declaration.payloadSchema)(given(flags)).pipe(Effect.flatMap(Sdk.session.signIn), answer(json));
    }),
).pipe(Command.withDescription("Sign in with email and password. The token is the bearer for every later call. With --env <env>, sign in by device code instead: it prints a code and where to approve it, waits, and keeps the session."));
