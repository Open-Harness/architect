// The text of generated/infra/alchemy.run.ts. Only the model's decisions are written into it; a run's names come from the plan, at run time.
import type { Model } from "@orthograph/compiler";
import type { RenderedFile } from "#modules/names/types.js";
import { GENERATED, bindingOf, databaseStores, lines } from "#modules/names/service.js";
import { COMPATIBILITY_DATE } from "#modules/server/service.js";

export const renderStack = (model: Model, name: string): RenderedFile => {
  const actors = Object.values(model.things).some((t) => t.lives === "actor");
  const migrations: ReadonlyArray<readonly [string, string]> = [["DB", "../server/migrations"], ...databaseStores(model).map((s): readonly [string, string] => [bindingOf(s), `../server/migrations/${s.name}`])];
  const classes: ReadonlyArray<readonly [string, string]> = actors ? [["World", "WORLD"], ["Actor", "ACTORS"]] : [["World", "WORLD"]];
  const table = (rows: ReadonlyArray<readonly [string, string]>) => rows.map(([k, v]) => `  ${k}: ${JSON.stringify(v)},`);
  return {
    path: "generated/infra/alchemy.run.ts",
    scaffold: false,
    content: lines(
      GENERATED,
      "// The staging stack (M7.03). `ortho env up|destroy staging --run <id>` runs it with `alchemy deploy|destroy`. The model decides what is bound; the run decides the names,",
      "// which the plan (`packages/cli/src/modules/staging/internal/plan.ts`) holds and `ortho env up` writes to the file `ORTHO_STAGING_INPUT` names.",
      `import * as Alchemy from "alchemy";`,
      `import * as State from "alchemy/State";`,
      `import * as Cloudflare from "@alchemy.run/cloudflare";`,
      `import * as Config from "effect/Config";`,
      `import * as Effect from "effect/Effect";`,
      `import * as FileSystem from "effect/FileSystem";`,
      `import * as Path from "effect/Path";`,
      "",
      "interface Resource { readonly kind: string; readonly name?: string; readonly binding?: string; readonly script?: string; readonly class?: string }",
      "interface Input {",
      "  readonly plan: { readonly prefix: string; readonly resources: ReadonlyArray<Resource> };",
      "  /** The revision's bundle, built once. */",
      "  readonly main: string;",
      "  readonly vars: Readonly<Record<string, string>>;",
      "}",
      "",
      "/** Each database binding's migrations folder, beside the generated server. */",
      "const MIGRATIONS: Readonly<Record<string, string>> = {",
      table(migrations),
      "};",
      "/** Each Durable Object class the Worker exports, and the binding it is under. */",
      "const CLASSES: Readonly<Record<string, string>> = {",
      table(classes),
      "};",
      "",
      "export default Alchemy.Stack(",
      `  ${JSON.stringify(name)},`,
      // Local state: `Cloudflare.state()` would deploy a state Worker, a Durable Object and a secrets store that carry no run's prefix.
      "  { providers: Cloudflare.providers(), state: State.localState() },",
      "  Effect.gen(function* () {",
      "    const fs = yield* FileSystem.FileSystem;",
      "    const path = yield* Path.Path;",
      `    const input = JSON.parse(yield* Effect.orDie(fs.readFileString(yield* Config.String("ORTHO_STAGING_INPUT")))) as Input;`,
      `    const env: Cloudflare.WorkerBindingProps = { ...input.vars, AUTH_SECRET: yield* Config.Redacted("ORTHO_AUTH_SECRET") };`,
      "",
      "    for (const r of input.plan.resources) {",
      `      if (r.kind === "d1") {`,
      "        const dir = MIGRATIONS[String(r.binding)];",
      "        if (dir === undefined) return yield* Effect.die(`the plan binds ${r.binding}, which the model does not`);",
      "        env[String(r.binding)] = yield* Cloudflare.D1.Database(`Db${r.binding}`, { name: String(r.name), migrations: path.resolve(import.meta.dirname, dir) });",
      "      }",
      `      if (r.kind === "durable-object-namespace") {`,
      "        const binding = CLASSES[String(r.class)];",
      "        if (binding === undefined) return yield* Effect.die(`the plan has the class ${r.class}, which the model does not`);",
      "        env[binding] = Cloudflare.DurableObject(String(r.class), { className: String(r.class) });",
      "      }",
      "    }",
      "",
      `    const worker = input.plan.resources.find((r) => r.kind === "worker");`,
      `    if (worker === undefined) return yield* Effect.die("the plan has no Worker");`,
      `    const server = yield* Cloudflare.Worker("Server", {`,
      "      name: String(worker.name),",
      "      main: input.main,",
      "      // The bundle is the revision's own, built once and deployed unchanged.",
      "      bundle: false,",
      "      // The address on, previews off, said out loud.",
      "      workersDev: { enabled: true, previewsEnabled: false },",
      `      compatibility: { date: ${JSON.stringify(COMPATIBILITY_DATE)}, flags: ["nodejs_compat"] },`,
      "      env,",
      "    });",
      "    return { url: server.url };",
      "  }),",
      ");",
    ),
  };
};
