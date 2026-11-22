// What the generated Alchemy stack (generated/infra/alchemy.run.ts) reads of a run: the plan, the bundle, and the Worker's plain settings. The stack takes its names from the plan
// and its settings from here: the server config's vars, the revision and the bundle's hash, set so `/_ortho/bundle` answers (spike snag 6).
import { Names } from "orthograph/server";
import { Effect } from "effect";
import { StagingFailed, type Plan } from "../types.ts";

interface Server {
  readonly d1_databases?: ReadonlyArray<Record<string, unknown>>;
  readonly vars?: Record<string, string>;
}

/** The keys of the server's wrangler config the plan covers: databases and Durable Objects are planned; the rest is plain settings. Anything else is refused, because the stack would not make it and `destroy` would not list it. */
const COVERED = new Set(["name", "main", "compatibility_date", "compatibility_flags", "d1_databases", "durable_objects", "migrations", "vars"]);

/** The server's config is JSONC with whole-line comments only. */
export const parseServer = (text: string): Effect.Effect<Server & Record<string, unknown>, StagingFailed> =>
  Effect.try({
    try: () => JSON.parse(text.split("\n").filter((l) => !l.trim().startsWith("//")).join("\n")) as Server & Record<string, unknown>,
    catch: () => new StagingFailed({ message: "generated/server/wrangler.jsonc is not readable: run `ortho generate`" }),
  });

export interface Derive {
  readonly server: Server & Record<string, unknown>;
  readonly plan: Plan;
  readonly built: { readonly main: string; readonly revision: string; readonly sha256: string };
}

/** The file the stack's `ORTHO_STAGING_INPUT` names. */
export interface StackInput {
  readonly plan: Plan;
  readonly main: string;
  readonly vars: Readonly<Record<string, string>>;
}

/** Every database the server binds is one the plan names, and the other way round: the plan and the projection cannot drift apart unseen. */
export const stackInput = ({ server, plan, built }: Derive): Effect.Effect<string, StagingFailed> =>
  Effect.gen(function* () {
    // Only what the plan covers may be bound: a binding of another kind (R2, KV, queues, services...) would be made by `up` and not deleted by `destroy`.
    const odd = Object.keys(server).filter((k) => !COVERED.has(k));
    if (odd.length > 0) {
      return yield* new StagingFailed({ message: `generated/server/wrangler.jsonc has ${odd.join(", ")}, which the staging plan does not cover: plan it (and its destroy) before it is deployed` });
    }
    const planned = plan.resources.filter((r) => r.kind === "d1");
    const bound = (server.d1_databases ?? []).map((d) => String(d["binding"]));
    const unplanned = bound.filter((b) => !planned.some((r) => r.binding === b));
    const unbound = planned.filter((r) => !bound.includes(String(r.binding)));
    if (unplanned.length > 0 || unbound.length > 0) {
      return yield* new StagingFailed({ message: `the plan and generated/server/wrangler.jsonc disagree about the databases: bound but not planned ${JSON.stringify(unplanned)}, planned but not bound ${JSON.stringify(unbound.map((r) => r.binding))}` });
    }
    const input: StackInput = {
      plan,
      main: built.main,
      vars: {
        ...server.vars,
        OTLP_URL: "",
        [Names.variable("ENVIRONMENT")]: plan.environment,
        [Names.variable("REVISION")]: built.revision,
        [Names.variable("BUNDLE_SHA256")]: built.sha256,
      },
    };
    return `${JSON.stringify(input, null, 2)}\n`;
  });
