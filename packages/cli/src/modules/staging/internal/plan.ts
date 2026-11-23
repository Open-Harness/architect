// The plan, and the only place a prefix is formed: from the model, the app's name, the environment and the run. Pure: no file, no network.
import { Effect } from "effect";
import type { Model } from "@orthograph/compiler";
import { StagingRefused, type Plan, type Resource } from "../types.ts";

/** The environments planned and deployed to the cloud, each with the short form every resource name carries for it (`design/decisions/M7-cloud.md`, addendum; `test` is a pull request's world, M7.05). The one place that maps them. */
export const CLOUD = { staging: "stg", test: "test" } as const;
export const shortOf = (environment: string): string | undefined => (Object.hasOwn(CLOUD, environment) ? CLOUD[environment as keyof typeof CLOUD] : undefined);
/** A name Cloudflare would refuse: a Worker's is 63 characters or fewer on `workers.dev`; none is stated for D1, so 63 is held there too (M7-cloud, addendum of 21 November 2026). */
export const MAX_NAME = 63;
export const RUN = /^[a-z0-9]{1,20}$/;

/** `plugged-in` is `pluggedin`: an app's letters and digits only. */
const slug = (app: string) => app.toLowerCase().replace(/[^a-z0-9]/g, "");
export const prefixOf = (app: string, short: string, run: string) => `ortho-${slug(app)}-${short}-${run}`;
/** A name belongs to a run when it is the prefix or continues it past a dash: run `1` does not own run `12`'s resources. */
export const owns = (prefix: string, name: string) => name === prefix || name.startsWith(`${prefix}-`);
/** The `workers.dev` address of a run's Worker: `https://<prefix>-worker.<the account's subdomain>.workers.dev`. */
export const stagingUrl = (prefix: string, subdomain: string) => `https://${workerOf(prefix)}.${subdomain}.workers.dev`;
export const workerOf = (prefix: string) => `${prefix}-worker`;

/** The Worker, the default database, one database for each declared database store, and the namespaces the Worker's actors share: what the generated `wrangler.jsonc` binds, under the prefix. */
const resources = (model: Pick<Model, "things" | "stores">, prefix: string): ReadonlyArray<Resource> => {
  const stores = Object.values(model.stores ?? {}).filter((s) => s.kind === "database").map((s) => s.name).sort();
  const actors = Object.values(model.things).some((t) => t.lives === "actor");
  return [
    { kind: "worker", name: workerOf(prefix) },
    { kind: "d1", name: `${prefix}-db`, binding: "DB" },
    ...stores.map((s): Resource => ({ kind: "d1", name: `${prefix}-db-${s}`, binding: `DB_${s.toUpperCase().replace(/-/g, "_")}` })),
    { kind: "durable-object-namespace", script: workerOf(prefix), class: "World" },
    ...(actors ? [{ kind: "durable-object-namespace", script: workerOf(prefix), class: "Actor" } satisfies Resource] : []),
  ];
};

export interface Inputs {
  readonly model: Pick<Model, "things" | "stores" | "environments">;
  readonly app: string;
  readonly environment: string;
  readonly run: string | undefined;
}

/** The plan, or why there is none. */
export const plan = ({ model, app, environment, run }: Inputs): Effect.Effect<Plan, StagingRefused> =>
  Effect.gen(function* () {
    if (run === undefined || !RUN.test(run)) {
      return yield* new StagingRefused({ message: `--run needs a run id of 1 to 20 lower-case letters and digits (got ${run === undefined ? "none" : JSON.stringify(run)})` });
    }
    if (model.environments?.[environment] === undefined) {
      return yield* new StagingRefused({ message: `no environment "${environment}" in blueprint/environments/` });
    }
    const short = shortOf(environment);
    if (short === undefined) {
      return yield* new StagingRefused({ message: `${environment}: only ${Object.keys(CLOUD).join(" and ")} are planned and deployed to the cloud so far` });
    }
    if (model.environments[environment]?.cloud?.provider !== "cloudflare") {
      return yield* new StagingRefused({ message: `the ${environment} environment does not declare Cloud.cloudflare(...), so there is nothing to deploy` });
    }
    const prefix = prefixOf(app, short, run);
    const planned = resources(model, prefix);
    const tooLong = planned.map((r) => r.name ?? r.script ?? "").filter((n) => n.length > MAX_NAME);
    if (tooLong.length > 0) {
      return yield* new StagingRefused({
        message: `a name is too long for Cloudflare (${MAX_NAME} characters at most): ${[...new Set(tooLong)].map((n) => `${n} (${n.length})`).join(", ")}. Shorten the project's name or the store's.`,
      });
    }
    return { app, environment, run, prefix, resources: planned };
  });

/** The plan as it is printed: one JSON document, the same bytes for the same inputs. */
export const render = (p: Plan): string => `${JSON.stringify(p, null, 2)}\n`;
