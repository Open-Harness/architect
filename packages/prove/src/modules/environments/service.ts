import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { Effect } from "effect";
import { Compiler, nodeSource } from "@orthograph/compiler";
import { Build } from "#modules/build/service.js";
import { Collectors, privateKeys } from "#modules/telemetry/service.js";
import { Sinks } from "#modules/sinks/service.js";
import { Worlds } from "#modules/world/service.js";
import type { EnvironmentsApi, Up } from "./types.ts";
import { telemetryDir } from "./internal/collector.ts";
import { environmentConfig, logbookOf, portalOf } from "./internal/config.ts";
import { startLogbook } from "./internal/logbook.ts";
import { choosePort, files, launchOnFreePort, reap, writePort } from "./internal/process.ts";
import { NAME, dirOf, failed, io, status } from "./internal/status.ts";
import { verify } from "./internal/identity.ts";
import { ensureSecrets } from "./internal/secrets.ts";

/** The environment as the blueprint declares it, and only one a long-lived workerd can run the revision's bundle for. */
const declared = (root: string, name: string) =>
  Effect.gen(function* () {
    if (!NAME.test(name)) return yield* failed(`"${name}" isn't an environment name`);
    const model = yield* Compiler.model.pipe(
      Effect.provide(nodeSource(root)),
      Effect.mapError((e) => failed(e._tag === "BlueprintInvalid" ? `the blueprint is invalid:\n  - ${e.problems.join("\n  - ")}` : e.message)),
    );
    const environment = model.environments?.[name];
    const known = Object.keys(model.environments ?? {}).filter((n) => n !== "local");
    if (!environment) return yield* failed(`no environment "${name}" in blueprint/environments/ (there is ${known.join(", ") || "none"})`);
    if (name === "local") return yield* failed(`"local" is not kept running: it is what \`ortho dev\` and \`ortho prove --env local\` start`);
    return { environment, model, strip: privateKeys(model) };
  });

const up: EnvironmentsApi["up"] = ({ root: given, name, port, revision, policy, env, logbook: givenLogbook }) =>
  Effect.gen(function* () {
    const root = resolve(given);
    const dir = dirOf(root, name);
    if (name === "logbook") {
      if (!NAME.test(name)) return yield* failed(`"${name}" isn't an environment name`);
      const running = yield* status(root, name);
      if (running.state === "up") return running;
      if (!policy) return yield* failed("the logbook needs a policy: ORTHO_OIDC_ISSUER, ORTHO_OIDC_REPOSITORY, ORTHO_OIDC_REF and ORTHO_OIDC_WORKFLOW");
      return yield* startLogbook(dir, port, policy);
    }
    const { environment, model, strip } = yield* declared(root, name);
    // An environment that hosts worlds, or that another is promoted from (so it is proved where it runs), records telemetry
    // in a collector of its own, which lives until `down` (D3 #52, #91).
    const hosts = environment.lifetimeMs !== null;
    const records = hosts || Object.values(model.environments ?? {}).some((e) => e.promotesFrom === name);
    const f = files(dir);
    yield* io(`${dir}`, () => mkdirSync(f.state, { recursive: true }));
    const now = yield* status(root, name);
    // The portal route reads the logbook: the one asked for, else the one running here (D3 #131).
    const book = yield* status(root, "logbook");
    const logbook = givenLogbook ?? (book.state === "up" ? book.url : undefined);
    const held = existsSync(f.config) ? logbookOf(readFileSync(f.config, "utf8")) : undefined;
    const requested = revision === undefined ? undefined : yield* Build.find(root, revision).pipe(Effect.mapError((e) => failed(e.message)));
    if (now.state === "up" && (revision === undefined || (revision === now.revision && requested?.sha256 === now.sha256)) && (!records || now.telemetry !== undefined) && held === logbook) return now;
    // Not running, or running another bundle: whatever is left of it goes first. The state stays.
    yield* reap(dir);

    const rev = revision ?? (yield* Build.revision(root).pipe(Effect.mapError((e) => failed(e.message))));
    const kept = yield* Build.find(root, rev).pipe(Effect.mapError((e) => failed(e.message)));
    const built = kept ?? (revision !== undefined
      ? yield* failed(`revision ${rev} has no artefact: run \`ortho build\` at that commit`)
      : yield* Build.build(root, env).pipe(Effect.mapError((e) => failed(e.message))));

    const base = join(root, "generated/server/wrangler.jsonc");
    if (!existsSync(base)) return yield* failed(`${base} is missing: run nx sync first`);
    const chosen = yield* choosePort(dir, port).pipe(Effect.mapError(failed));
    const otlp = records
      ? yield* Collectors.launch({ dir: telemetryDir(dir), strip }).pipe(Effect.mapError((e) => failed(`${name}'s collector didn't start: ${e.message}`)))
      : undefined;
    const portal = portalOf(built);
    yield* io(`${dir}`, () => {
      ensureSecrets(f.secrets, Object.keys(environment.secrets));
      writeFileSync(f.config, environmentConfig(root, readFileSync(base, "utf8"), {
        name, revision: built.revision, sha256: built.sha256, main: built.main, ...(portal === undefined ? {} : { portal }), ...(otlp ? { otlp } : {}), ...(hosts ? { worlds: true } : {}), ...(logbook ? { logbook } : {}),
      }));
      writeFileSync(f.bundle, JSON.stringify({ revision: built.revision, sha256: built.sha256 }) + "\n");
      writePort(dir, chosen);
    });
    // The environment's sinks, read by name now and handed to its process alone: never in its config or its secrets file.
    const sinks = yield* Sinks.resolve({ sinks: environment.telemetry ?? [{ sink: "local" }], env: env ?? {} });
    const launched = yield* launchOnFreePort((at) => Worlds.launch({
      config: f.config, state: f.state, port: at, log: f.log, pidFile: f.pid, envFile: f.secrets, secretEnv: sinks.secretEnv, ready: "/_ortho/bundle",
    }), dir, chosen, port !== undefined).pipe(
      Effect.tapError(() => reap(dir)),
      Effect.mapError((e) => failed(`${name} didn't start: ${e.message}`)),
    );
    return {
      state: "up", name, url: launched.url, port: Number(new URL(launched.url).port), pid: launched.pid, revision: built.revision, sha256: built.sha256,
      ...(records ? { telemetry: telemetryDir(dir) } : {}),
      ...(otlp ? { collector: otlp } : {}),
      ...(sinks.notes.length > 0 ? { notes: sinks.notes } : {}),
    } satisfies Up;
  });

const down: EnvironmentsApi["down"] = ({ root, name }) =>
  Effect.gen(function* () {
    if (!NAME.test(name)) return yield* failed(`"${name}" isn't an environment name`);
    yield* reap(dirOf(root, name));
  });

export const Environments: EnvironmentsApi = { up, down, verify, status: ({ root, name }) => status(root, name) };
