// `prove --env test`: a world in the long-lived test environment, the journeys and evals against it, a signed verdict
// per operation in the logbook, then the world destroyed (D3 #14, #50, #53).
import { randomBytes } from "node:crypto";
import { Effect } from "effect";
import type { Model } from "@orthograph/compiler";
import { Build } from "#modules/build/service.js";
import { Environments } from "#modules/environments/service.js";
import type { Project } from "#modules/journeys/types.js";
import { Releases } from "#modules/releases/service.js";
import { Collectors } from "#modules/telemetry/service.js";
import { TestWorlds } from "#modules/test-worlds/service.js";
import { Verdicts } from "#modules/verdicts/service.js";
import { ProveFailed, type ProveApi } from "../types.ts";
import { closing, exercise } from "./exercise.ts";

const TEST = "test";
const failed = (e: { readonly message: string }) => new ProveFailed({ message: e.message });

/** The lifetime in words and in milliseconds: the one asked for, else the environment's own. */
const lifetimeOf = (model: Model, asked: string | undefined) => {
  const own = model.environments?.[TEST]?.lifetimeMs ?? null;
  if (asked === undefined) {
    return own === null ? new ProveFailed({ message: `environment ${TEST} declares no lifetime, and no ORTHO_LIFETIME was given` }) : { ms: own, text: TestWorlds.formatLifetime(own) };
  }
  const ms = TestWorlds.parseLifetime(asked);
  return ms === undefined ? new ProveFailed({ message: `"${asked}" is not a lifetime (try 20s, 30m or 2 hours)` }) : { ms, text: asked };
};

export const proveInTest = (model: Model, project: Project, options: Parameters<ProveApi["test"]>[0]) =>
  Effect.gen(function* () {
    const { root, say } = options;
    if (!model.environments?.[TEST]) return yield* new ProveFailed({ message: `no environment "${TEST}" in blueprint/environments/` });
    const lifetime = lifetimeOf(model, options.lifetime);
    if (lifetime instanceof ProveFailed) return yield* lifetime;

    // The environment runs the revision being proved: its bundle is built when there is none, and a running one on another is restarted onto it.
    const revision = yield* Build.revision(root).pipe(Effect.mapError(failed));
    if (yield* Build.dirty(root).pipe(Effect.mapError(failed))) return yield* new ProveFailed({ message: "commit or stash changes before proving a revision in test" });
    const built = (yield* Build.find(root, revision).pipe(Effect.mapError(failed))) ?? (yield* Build.build(root, options.env).pipe(Effect.mapError(failed)));
    const environment = yield* Environments.up({ root, name: TEST, revision, env: options.env ?? {} }).pipe(Effect.mapError(failed));
    yield* Environments.verify({ root, name: TEST, pid: environment.pid, revision, sha256: built.sha256 }).pipe(Effect.mapError(failed));
    for (const note of environment.notes ?? []) yield* say(note);
    if (!environment.telemetry) return yield* new ProveFailed({ message: `environment ${TEST} has no collector of its own` });
    const collector = Collectors.read(environment.telemetry);

    const id = `${TEST}-${randomBytes(4).toString("hex")}`;
    return yield* Effect.acquireUseRelease(
      TestWorlds.create({ url: environment.url, id, lifetimeMs: lifetime.ms }).pipe(Effect.mapError(failed)),
      () =>
        Effect.gen(function* () {
          yield* say(`world ${id} · expires in ${lifetime.text}`);
          const done = yield* exercise(model, project, environment.url, collector, undefined, environment.collector);
          for (const line of [...done.journeys.lines, ...done.evals.lines]) yield* say(line);
          const verdict = closing(done);
          yield* say(verdict.line);

          const results = done.results;
          yield* Environments.verify({ root, name: TEST, pid: environment.pid, revision, sha256: built.sha256 }).pipe(Effect.mapError(failed));
          yield* Build.unchanged(root, built.commit).pipe(Effect.mapError(failed));
          // The portal and `impact` judge a verdict against the model of the revision it proved, so the logbook keeps that model first (D3 #138).
          yield* Releases.keep({ logbook: options.logbook, source: options.token, model, revision }).pipe(Effect.mapError(failed));
          const token = yield* Verdicts.mint(options.token).pipe(Effect.mapError(failed));
          yield* Verdicts.post({ logbook: options.logbook, token, revision, sha256: built.sha256, environment: TEST, results }).pipe(Effect.mapError((e) => new ProveFailed({ message: `the verdicts weren't recorded: ${e.message}` })));
          yield* say(`verdicts ${results.map((r) => `${r.operation} ${r.verdict === "pass" ? "✔" : "✘"}`).join("  ")}   (revision ${revision})`);
          return { passed: verdict.passed };
        }),
      // Whether the run passed, failed or was interrupted, the world goes; "world destroyed" is said only when it did.
      () => TestWorlds.destroy({ url: environment.url, id }).pipe(Effect.flatMap(() => say("world destroyed")), Effect.ignore),
    );
  });
