// Generated from blueprint/projections/infra.ts. Do not edit.
// The staging stack (M7.03). `ortho env up|destroy staging --run <id>` runs it with `alchemy deploy|destroy`. The model decides what is bound; the run decides the names,
// which the plan (`packages/cli/src/modules/staging/internal/plan.ts`) holds and `ortho env up` writes to the file `ORTHO_STAGING_INPUT` names.
import * as Alchemy from "alchemy";
import * as State from "alchemy/State";
import * as Cloudflare from "@alchemy.run/cloudflare";
import * as Config from "effect/Config";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";

interface Resource { readonly kind: string; readonly name?: string; readonly binding?: string; readonly script?: string; readonly class?: string }
interface Input {
  readonly plan: { readonly prefix: string; readonly resources: ReadonlyArray<Resource> };
  /** The revision's bundle, built once. */
  readonly main: string;
  readonly vars: Readonly<Record<string, string>>;
}

/** Each database binding's migrations folder, beside the generated server. */
const MIGRATIONS: Readonly<Record<string, string>> = {
  DB: "../server/migrations",
};
/** Each Durable Object class the Worker exports, and the binding it is under. */
const CLASSES: Readonly<Record<string, string>> = {
  World: "WORLD",
};

export default Alchemy.Stack(
  "plugged-in",
  { providers: Cloudflare.providers(), state: State.localState() },
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const input = JSON.parse(yield* Effect.orDie(fs.readFileString(yield* Config.String("ORTHO_STAGING_INPUT")))) as Input;
    const env: Cloudflare.WorkerBindingProps = { ...input.vars, AUTH_SECRET: yield* Config.Redacted("ORTHO_AUTH_SECRET") };

    for (const r of input.plan.resources) {
      if (r.kind === "d1") {
        const dir = MIGRATIONS[String(r.binding)];
        if (dir === undefined) return yield* Effect.die(`the plan binds ${r.binding}, which the model does not`);
        env[String(r.binding)] = yield* Cloudflare.D1.Database(`Db${r.binding}`, { name: String(r.name), migrations: path.resolve(import.meta.dirname, dir) });
      }
      if (r.kind === "durable-object-namespace") {
        const binding = CLASSES[String(r.class)];
        if (binding === undefined) return yield* Effect.die(`the plan has the class ${r.class}, which the model does not`);
        env[binding] = Cloudflare.DurableObject(String(r.class), { className: String(r.class) });
      }
    }

    const worker = input.plan.resources.find((r) => r.kind === "worker");
    if (worker === undefined) return yield* Effect.die("the plan has no Worker");
    const server = yield* Cloudflare.Worker("Server", {
      name: String(worker.name),
      main: input.main,
      // The bundle is the revision's own, built once and deployed unchanged.
      bundle: false,
      // The address on, previews off, said out loud.
      workersDev: { enabled: true, previewsEnabled: false },
      compatibility: { date: "2026-08-01", flags: ["nodejs_compat"] },
      env,
    });
    return { url: server.url };
  }),
);
