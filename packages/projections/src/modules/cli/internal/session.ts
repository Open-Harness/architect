// generated/cli, the session commands: `session sign-in --env <env>` signs in by device code (D3 #10), `session show --env
// <env>` uses the session it kept. Without `--env` both stay the operations' own: email and password, and ACME_TOKEN.
import type { Model, OperationModel } from "@orthograph/compiler";
import { flagCode, helpOf } from "#modules/names/service.js";
import { GENERATED, camel, lines } from "#modules/names/service.js";
import type { RenderedFile } from "#modules/names/types.js";

/**
 * The starter's identity things (`packages/preset`): the operation that signs in with email and password, and the one
 * that says who is signed in. A project without both keeps every command as the operation declares it.
 */
export const sessionOperations = (model: Model): { readonly signIn: OperationModel; readonly show: OperationModel } | undefined => {
  const signIn = model.operations["session.sign-in"];
  const show = model.operations["session.show"];
  return signIn && show && signIn.kind === "operation" ? { signIn, show } : undefined;
};

const device = (name: string): RenderedFile => {
  const env = name.toUpperCase().replace(/-/g, "_");
  return {
    path: "generated/cli/src/session/device.ts",
    scaffold: false,
    content: lines(
      GENERATED,
      "// Signing in by device code (RFC 8628) against Better Auth, and the session this machine keeps for each environment.",
      `import { Config, Console, Data, Duration, Effect, FileSystem, Option, Path, Schedule, Schema } from "effect";`,
      `import { FetchHttpClient, HttpClient, HttpClientRequest } from "effect/http";`,
      `import * as Sdk from "../../../sdk/src/index.ts";`,
      "",
      `const CLIENT = "${name}-cli";`,
      `const GRANT = "urn:ietf:params:oauth:grant-type:device_code";`,
      "",
      "export class NotSignedIn extends Data.TaggedError(\"NotSignedIn\")<{ readonly env: string }> {}",
      "export class DeviceRefused extends Data.TaggedError(\"DeviceRefused\")<{ readonly error: string }> {}",
      "/** The code isn't approved yet (`authorization_pending`), or the server wants fewer polls (`slow_down`). */",
      "class Waiting extends Data.TaggedError(\"Waiting\")<{ readonly slower: boolean }> {}",
      "",
      "const Started = Schema.Struct({ device_code: Schema.String, user_code: Schema.String, verification_uri_complete: Schema.String, expires_in: Schema.Number, interval: Schema.Number });",
      "const Issued = Schema.Struct({ access_token: Schema.String });",
      "const Refused = Schema.Struct({ error: Schema.String });",
      "const Sessions = Schema.Record(Schema.String, Schema.Struct({ url: Schema.String, token: Schema.String }));",
      "",
      `const baseUrl = Config.String("${env}_URL").pipe(Config.withDefault("http://127.0.0.1:8787"));`,
      "",
      `/** Where the sessions are kept: ${env}_CONFIG_DIR, else the user's config folder. */`,
      "const location = Effect.gen(function* () {",
      "  const path = yield* Path.Path;",
      `  const dir = yield* Config.String("${env}_CONFIG_DIR").pipe(`,
      `    Config.orElse(() => Config.String("XDG_CONFIG_HOME").pipe(Config.map((base) => path.join(base, "${name}")))),`,
      `    Config.orElse(() => Config.String("HOME").pipe(Config.map((home) => path.join(home, ".config", "${name}")))),`,
      "  );",
      "  return { dir, file: path.join(dir, \"session.json\") };",
      "});",
      "",
      "const kept = Effect.gen(function* () {",
      "  const fs = yield* FileSystem.FileSystem;",
      "  const { file } = yield* location;",
      "  if (!(yield* fs.exists(file))) return {} as typeof Sessions.Type;",
      "  return yield* fs.readFileString(file).pipe(Effect.flatMap(Schema.decodeUnknownEffect(Schema.fromJsonString(Sessions))));",
      "});",
      "",
      "const keep = (env: string, session: { readonly url: string; readonly token: string }) =>",
      "  Effect.gen(function* () {",
      "    const fs = yield* FileSystem.FileSystem;",
      "    const { dir, file } = yield* location;",
      "    const all = yield* kept;",
      "    yield* fs.makeDirectory(dir, { recursive: true, mode: 0o700 });",
      "    yield* fs.writeFileString(file, JSON.stringify({ ...all, [env]: session }, null, 2) + \"\\n\", { mode: 0o600 });",
      "  });",
      "",
      "/** The session kept for `env`, or `NotSignedIn`. */",
      "const saved = (env: string) =>",
      "  Effect.flatMap(kept, (all) => { const s = all[env]; return s ? Effect.succeed(s) : Effect.fail(new NotSignedIn({ env })); });",
      "",
      "/** Run `effect` as the person signed in to `env`, against the server that signed them in. The token is never shown. */",
      "export const withSession = (env: string) => <A, E, R>(effect: Effect.Effect<A, E, R>) =>",
      "  Effect.flatMap(saved(env), (s) => effect.pipe(Effect.provide(Sdk.layer(s.url, s.token))));",
      "",
      "/** The flags a command was given, without the ones it wasn't. */",
      "export const given = (flags: Readonly<Record<string, Option.Option<string>>>) =>",
      "  Object.fromEntries(Object.entries(flags).flatMap(([key, value]) => (Option.isSome(value) ? [[key, value.value]] : [])));",
      "",
      "const post = (url: string, body: unknown) =>",
      "  HttpClient.execute(HttpClientRequest.post(url).pipe(HttpClientRequest.bodyJsonUnsafe(body))).pipe(",
      "    Effect.flatMap((response) => Effect.map(response.json, (json) => ({ status: response.status, json }))),",
      "    Effect.provide(FetchHttpClient.layer),",
      "  );",
      "",
      "const refused = (json: unknown) =>",
      "  Effect.fail(new DeviceRefused({ error: Option.match(Schema.decodeUnknownOption(Refused)(json), { onNone: () => \"unexpected answer\", onSome: (r) => r.error }) }));",
      "",
      "/** One poll: the token, or `Waiting`, or a refusal. */",
      "const poll = (url: string, deviceCode: string) =>",
      "  post(`${url}/api/auth/device/token`, { grant_type: GRANT, device_code: deviceCode, client_id: CLIENT }).pipe(",
      "    Effect.flatMap(({ status, json }): Effect.Effect<string, Waiting | DeviceRefused | Schema.SchemaError> => {",
      "      if (status === 200) return Effect.map(Schema.decodeUnknownEffect(Issued)(json), (issued) => issued.access_token);",
      "      const error = Option.match(Schema.decodeUnknownOption(Refused)(json), { onNone: () => \"\", onSome: (r) => r.error });",
      "      return error === \"authorization_pending\" || error === \"slow_down\" ? Effect.fail(new Waiting({ slower: error === \"slow_down\" })) : refused(json);",
      "    }),",
      "  );",
      "",
      "/** Wait the server's interval between polls, and five seconds longer after each `slow_down`. */",
      "const spacing = (seconds: number) =>",
      "  Schedule.fromStep(Effect.sync(() => {",
      "    let wait = seconds;",
      "    return (_now: number, last: unknown): Effect.Effect<[number, Duration.Duration]> =>",
      "      Effect.sync(() => { if (last instanceof Waiting && last.slower) wait += 5; return [wait, Duration.seconds(wait)]; });",
      "  }));",
      "",
      "/** Ask for a code, say where to approve it, poll until it is approved, and keep the session for `env`. */",
      "export const deviceSignIn = (env: string) =>",
      "  Effect.gen(function* () {",
      "    const url = yield* baseUrl;",
      "    const started = yield* post(`${url}/api/auth/device/code`, { client_id: CLIENT }).pipe(",
      "      Effect.flatMap(({ status, json }): Effect.Effect<typeof Started.Type, DeviceRefused | Schema.SchemaError> =>",
      "        status === 200 ? Schema.decodeUnknownEffect(Started)(json) : refused(json)),",
      "    );",
      "    // The server names itself by its configured address; the person reaches it where this CLI did.",
      "    const approval = new URL(started.verification_uri_complete);",
      "    yield* Console.log(`code ${started.user_code}`);",
      "    yield* Console.log(`approve at ${url}${approval.pathname}${approval.search}`);",
      "    const token = yield* poll(url, started.device_code).pipe(",
      "      Effect.retry({ schedule: spacing(started.interval), while: (e) => e instanceof Waiting }),",
      "      Effect.timeoutOrElse({ duration: Duration.seconds(started.expires_in), orElse: () => Effect.fail(new DeviceRefused({ error: \"expired_token\" })) }),",
      "    );",
      "    yield* keep(env, { url, token });",
      "    yield* Console.log(\"signed in\");",
      "  });",
    ),
  };
};

const commands = (name: string, ops: { readonly signIn: OperationModel; readonly show: OperationModel }): ReadonlyArray<RenderedFile> => {
  const flags = (op: OperationModel) => Object.entries(op.payload).map(([k, f]) => `${k}: ${flagCode(k, f)}.pipe(Flag.optional)`);
  const env = (what: string) => `env: Flag.String("env").pipe(Flag.withMetavar("env"), Flag.withDescription(${JSON.stringify(what)}), Flag.optional)`;
  const file = (op: OperationModel, doc: string, body: ReadonlyArray<string>): RenderedFile => ({
    path: `generated/cli/src/${op.thing}/${op.verb}.ts`,
    scaffold: false,
    content: lines(
      GENERATED,
      `import { Effect, Option, Schema } from "effect";`,
      `import { Command, Flag } from "effect/cli";`,
      `import { declaration } from "../../../api/src/${op.thing}/${op.verb}.ts";`,
      `import * as Sdk from "../../../sdk/src/index.ts";`,
      `import { answer, refused } from "../output.ts";`,
      `import { deviceSignIn, given, withSession } from "./device.ts";`,
      "",
      `/** ${doc} Each flag is handed on as text; the declaration decodes it. \`--json\` prints the whole answer as JSON. */`,
      ...body,
    ),
  });
  const verb = (op: OperationModel) => `Sdk.${camel(op.thing)}.${camel(op.verb)}`;
  const signIn = file(ops.signIn, `${ops.signIn.description} With \`--env <env>\`, sign in by device code instead: it prints a code and where to approve it, waits, and keeps the session for \`session show --env <env>\`.`, [
    `export const ${camel(ops.signIn.verb)} = Command.make(`,
    `  "${ops.signIn.verb}",`,
    `  { ${[...flags(ops.signIn), env("Sign in by device code to this environment, and keep the session, instead of with the flags."), `json: Flag.Boolean("json").pipe(Flag.withDefault(false))`].join(", ")} },`,
    "  ({ json, env, ...flags }) =>",
    "    Effect.gen(function* () {",
    "      if (Option.isSome(env)) return yield* deviceSignIn(env.value).pipe(refused);",
    `      return yield* Schema.decodeUnknownEffect(declaration.payloadSchema)(given(flags)).pipe(Effect.flatMap(${verb(ops.signIn)}), answer(json));`,
    "    }),",
    `).pipe(Command.withDescription(${JSON.stringify(`${helpOf(ops.signIn)} With --env <env>, sign in by device code instead: it prints a code and where to approve it, waits, and keeps the session.`)}));`,
  ]);
  const show = file(ops.show, `${ops.show.description} With \`--env <env>\`, as the person that environment's session belongs to.`, [
    `export const ${camel(ops.show.verb)} = Command.make(`,
    `  "${ops.show.verb}",`,
    `  { ${[...flags(ops.show), env("Ask as the person this environment's kept session belongs to."), `json: Flag.Boolean("json").pipe(Flag.withDefault(false))`].join(", ")} },`,
    "  ({ json, env, ...flags }) => {",
    `    const run = Schema.decodeUnknownEffect(declaration.payloadSchema)(given(flags)).pipe(Effect.flatMap(${verb(ops.show)}));`,
    "    return Effect.gen(function* () { return Option.isSome(env) ? yield* withSession(env.value)(run) : yield* run; }).pipe(answer(json));",
    "  },",
    `).pipe(Command.withDescription(${JSON.stringify(`${helpOf(ops.show)} With --env <env>, as the person that environment's session belongs to.`)}));`,
  ]);
  return [device(name), signIn, show];
};

export const renderSessionCommands = (model: Model, name: string): ReadonlyArray<RenderedFile> => {
  const ops = sessionOperations(model);
  return ops ? commands(name, ops) : [];
};
