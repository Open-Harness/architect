import { resolve } from "node:path";
import { Effect } from "effect";
import { Compiler, nodeSource } from "@orthograph/compiler";
import { StagingFailed, StagingRefused, type Credentials, type Options, type Plan, type Said, type StagingApi, type Tools } from "./types.ts";
import { up } from "./internal/deploy.ts";
import { destroy } from "./internal/destroy.ts";
import { live } from "./internal/live.ts";
import { appOf } from "./internal/app.ts";
import { plan, prefixOf, render, stagingUrl } from "./internal/plan.ts";
export { proveAddress } from "./internal/address.ts";

const said = (out: string): Said => ({ out, err: "", exit: 0 });
const refusal = (message: string, exit: number): Said => ({ out: "", err: `${message.trimEnd()}\n`, exit });

/** The one plan, from the compiled model and the project's name (the `name` in `ortho.config.ts`). Both the printed plan and the real verbs read it here. */
const planOf = (options: Options): Effect.Effect<Plan, StagingRefused> =>
  Effect.gen(function* () {
    const { root, environment, run } = options;
    const model = yield* Compiler.model.pipe(
      Effect.provide(nodeSource(root)),
      Effect.mapError((e) => new StagingRefused({ message: e._tag === "BlueprintInvalid" ? `the blueprint is invalid:\n  - ${e.problems.join("\n  - ")}` : e.message })),
    );
    const app = yield* appOf(root);
    return yield* plan({ model, app, environment, run });
  });

/** Both credentials, or what is missing, said by name. Nothing is read from the cloud before this. */
const credentialsOf = ({ token, account }: Options["credentials"], environment: string): Effect.Effect<Credentials, StagingRefused> => {
  const missing = [...(token ? [] : ["CLOUDFLARE_API_TOKEN"]), ...(account ? [] : ["CLOUDFLARE_ACCOUNT_ID"])];
  return token && account
    ? Effect.succeed({ token, account })
    : Effect.fail(new StagingRefused({ message: `${missing.join(" and ")} ${missing.length > 1 ? "are" : "is"} not set: the ${environment} deploy reads both from the environment, and no connection was made` }));
};

const settle = (work: Effect.Effect<Said, StagingRefused | StagingFailed>): Effect.Effect<Said> =>
  work.pipe(Effect.catchTags({ StagingRefused: (e) => Effect.succeed(refusal(e.message, 2)), StagingFailed: (e) => Effect.succeed(refusal(e.message, 1)) }));

/** The root, made absolute once: the stack runs in another folder, so a relative `--root` (the workflow passes `examples/plugged-in`) would name files that are not there. */
const absolute = (options: Options): Options => ({ ...options, root: resolve(options.root) });

export const makeStaging = (tools: Tools): StagingApi => ({
  plan: (given) => settle(planOf(absolute(given)).pipe(Effect.map((p) => said(render(p))))),
  up: (given) =>
    settle(Effect.gen(function* () {
      const options = absolute(given);
      const p = yield* planOf(options);
      const credentials = yield* credentialsOf(options.credentials, p.environment);
      const url = yield* up(tools, credentials, options.root, p);
      return said(`${p.environment} up ${url}\n`);
    })),
  destroy: (given) =>
    settle(Effect.gen(function* () {
      const options = absolute(given);
      const p = yield* planOf(options);
      const credentials = yield* credentialsOf(options.credentials, p.environment);
      const done = yield* destroy(tools, credentials, options.root, p);
      return said(`${p.environment} destroy ${p.prefix}: alchemy ${done.alchemy}; the sweep deleted ${done.workers} Workers and ${done.databases} databases\n`);
    })),
  prefix: prefixOf,
  url: stagingUrl,
});

/** The staging commands against the real cloud: `pause` is how `main.ts` waits, `env` the process's environment (Cloudflare's variables are stripped from what a build sees). */
export const stagingLive = (pause: Tools["pause"], env: Readonly<Record<string, string | undefined>>): StagingApi => makeStaging(live(pause, env));

/** The prefix and the address are pure, for whoever needs them without a cloud: `ortho prove --env staging` reaches the deployed Worker at `stagingUrl(prefixOf(app, run), subdomain)`. */
export { prefixOf, stagingUrl } from "./internal/plan.ts";
