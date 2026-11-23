import { Names } from "orthograph/server";
import { join, resolve } from "node:path";
import { Effect } from "effect";
import { Compiler, nodeSource, type EnvironmentModel, type Model } from "@orthograph/compiler";
import { Environments } from "#modules/environments/service.js";
import type { Built } from "#modules/build/types.js";
import type { Up } from "#modules/environments/types.js";
import { Build } from "#modules/build/service.js";
import { Prove } from "#modules/prove/service.js";
import { Releases } from "#modules/releases/service.js";
import { Secrets } from "#modules/secrets/service.js";
import type { Env, Held } from "#modules/verdicts/types.js";
import { Verdicts } from "#modules/verdicts/service.js";
import { PromoteFailed, PromoteRefused, type PromoteApi, type Promoted, type Target } from "./types.ts";
import { runningOn } from "./internal/environment.ts";
import { bundleOf, verdictsIn } from "./internal/gate.ts";
import { productionRelease, stagingPrerelease } from "./internal/publishing.ts";

const failed = (e: { readonly message: string }) => new PromoteFailed({ message: e.message });

const live = (root: string, target: Target, up: Up, built: Built) => Environments.verify({ root, name: target, pid: up.pid, revision: built.revision, sha256: built.sha256 }).pipe(Effect.mapError(failed));
const stable = (root: string, target: Target, up: Up, built: Built) => Build.unchanged(root, built.commit).pipe(Effect.mapError(failed), Effect.flatMap(() => live(root, target, up, built)));

/** Retry completes only missing or hash-mismatched carried facts; complete facts are not duplicated. */
const carry = ({ root, up, built, logbook, env, model, earned }: { root: string; up: Up; built: Built; logbook: string; env: Env; model: Model; earned: ReadonlyArray<Held> }) => Effect.gen(function* () {
  const held = yield* Verdicts.latest({ logbook, revision: built.revision, environment: "production", ref: "refs/heads/main" }).pipe(Effect.mapError(failed));
  const complete = new Set(held.filter((v) => v.verdict === "pass" && v.sha256 === built.sha256).map((v) => v.operation));
  const missing = Object.keys(model.operations).filter((operation) => !complete.has(operation)).map((operation) => {
    const journeys = earned.find((row) => row.operation === operation)?.journeys;
    return { operation, verdict: "pass" as const, ...(journeys ? { journeys } : {}) };
  });
  yield* live(root, "production", up, built);
  if (missing.length === 0) return;
  const token = yield* Verdicts.sourceOf(env).pipe(Effect.flatMap(Verdicts.mint), Effect.mapError(failed));
  yield* live(root, "production", up, built);
  yield* Verdicts.post({ logbook, token, revision: built.revision, sha256: built.sha256, environment: "production", results: missing }).pipe(Effect.mapError((e) => new PromoteFailed({ message: `the verdicts weren't recorded: ${e.message}` })));
});

/** Which environment's verdicts a target needs: test for staging, and for production what it declares (`promotesFrom`), else staging. */
const earnedIn = (target: Target, environment: EnvironmentModel) => (target === "staging" ? "test" : (environment.promotesFrom ?? "staging"));

/** What the local pass can't reach, said so: the real cloud, and each domain it would be served at. */
const skipped = (environment: EnvironmentModel) => [
  ...(environment.cloud ? [`skipped ${environment.cloud.provider} (cloud pass)`] : []),
  ...Object.entries(environment.deploy).flatMap(([what, d]) => (d.domain ? [`skipped ${what} domain ${d.domain} (cloud pass)`] : [])),
];

const to: PromoteApi["to"] = ({ root, env, target, say }) =>
  Effect.gen(function* () {
    const model = yield* Compiler.model.pipe(
      Effect.provide(nodeSource(root)),
      Effect.mapError((e) => new PromoteFailed({ message: e._tag === "BlueprintInvalid" ? `the blueprint is invalid:\n  - ${e.problems.join("\n  - ")}` : e.message })),
    );
    const environment = model.environments?.[target];
    if (!environment) return yield* new PromoteFailed({ message: `no environment "${target}" in blueprint/environments/` });

    // Refusals first: nothing is started for a promotion the rules turn away.
    // A stored runtime secret with no value in the target would start a place that can't use it: each is named (M2.04).
    const unset = yield* Secrets.missing({ root, target, model });
    if (unset.length > 0) {
      return yield* new PromoteRefused({ lines: [`refused: ${target} has stored runtime secrets with no value`, ...unset.map((name) => `missing: ${name} has no value in ${target}: ortho secrets set ${name} --env ${target}`)] });
    }
    const revision = yield* Build.revision(root).pipe(Effect.mapError(failed));
    const built = yield* bundleOf(root, revision);
    yield* Build.unchanged(root, built.commit).pipe(Effect.mapError(failed));
    const logbook = yield* Releases.locate({ root, env }).pipe(Effect.mapError(failed));
    if (logbook === undefined) return yield* new PromoteFailed({ message: "no logbook: start one with `ortho env up logbook`, or set ORTHO_LOGBOOK_URL" });
    const from = earnedIn(target, environment);
    const earned = yield* verdictsIn(logbook, model, revision, from, built.sha256);
    yield* say(`${target} from ${from} ${revision} sha256:${built.sha256}`);

    const up = yield* runningOn(root, target, built);
    yield* say(`${target} up ${up.url}   bundle ${revision} sha256:${built.sha256} ✔`);

    if (target === "staging") {
      // The staging verdicts: the journeys and evals, run where staging runs, by people who really sign up.
      if (up.telemetry === undefined) return yield* new PromoteFailed({ message: "staging records no telemetry, so its evals have nothing to judge: another environment must declare promotesFrom: \"staging\"" });
      const proved = yield* Prove.against({ root, url: up.url, telemetry: up.telemetry, state: join(resolve(root), Names.folder, "environments", target, "state"), say }).pipe(Effect.mapError(failed));
      yield* stable(root, target, up, built);
      // Staleness judges these verdicts against the model of the revision they proved, so the logbook keeps that model first.
      yield* Releases.keep({ logbook, env, model, revision }).pipe(Effect.mapError(failed));
      const source = yield* Verdicts.sourceOf(env).pipe(Effect.mapError(failed));
      // Minted just before posting: the issuer's tokens live ten minutes and a prove can take longer.
      const token = yield* Verdicts.mint(source).pipe(Effect.mapError(failed));
      // The prerelease goes out only for a revision that proved itself where it runs, and before the verdicts are said.
      if (proved.passed) { yield* stable(root, target, up, built); yield* stagingPrerelease({ root, env, say, logbook, model, revision: built.commit }); }
      else yield* say("skipped publish (staging's proof failed: nothing is published for a revision that did not pass)");
      yield* live(root, target, up, built);
      yield* Verdicts.post({ logbook, token, revision, sha256: built.sha256, environment: "staging", results: proved.results }).pipe(Effect.mapError((e) => new PromoteFailed({ message: `the verdicts weren't recorded: ${e.message}` })));
      yield* say(`verdicts ${proved.results.map((r) => `${r.operation} ${r.verdict === "pass" ? "✔" : "✘"}`).join("  ")}   (revision ${revision})`);
      for (const line of skipped(environment)) yield* say(line);
      return { revision, sha256: built.sha256, passed: proved.passed } satisfies Promoted;
    }

    // Production: what staging proved is what runs, and the release is the logbook's record of it.
    const last = yield* Releases.last(logbook).pipe(Effect.mapError(failed));
    if (last?.revision === revision) {
      // A retry verifies existing package bytes before reporting the prior release as recovered.
      yield* productionRelease({ root, env, say, version: last.version, revision: built.commit });
      yield* live(root, target, up, built);
      yield* carry({ root, up, built, logbook, env, model, earned });
      yield* say(`release ${last.version} already recorded for ${revision}`);
      for (const line of skipped(environment)) yield* say(line);
      return { revision, sha256: built.sha256, passed: true, version: last.version } satisfies Promoted;
    }
    const version = yield* Releases.next(logbook, model).pipe(Effect.mapError(failed));
    // Publication may be partial on an npm error, but it must not create a new release or carried pass first.
    yield* productionRelease({ root, env, say, version, revision: built.commit });
    yield* live(root, target, up, built);
    yield* Releases.record({ logbook, env, model, revision, version }).pipe(Effect.mapError(failed));
    yield* say(`released ${version}`);
    // Nobody runs journeys in production: its verdict is staging's, carried to the same bundle the environment just reported. It
    // is what puts production in the logbook beside staging, so a change that unproves an operation stales it there too.
    yield* carry({ root, up, built, logbook, env, model, earned });
    for (const line of skipped(environment)) yield* say(line);
    return { revision, sha256: built.sha256, passed: true, version } satisfies Promoted;
  });

export const Promote: PromoteApi = { to };
