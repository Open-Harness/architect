import { Names } from "orthograph/server";
import { randomBytes } from "node:crypto";
import { resolve } from "node:path";
import { Clock, Duration, Effect } from "effect";
import { Compiler, nodeSource } from "@orthograph/compiler";
import { Collectors, FileMetrics, privateKeys } from "#modules/telemetry/service.js";
import { PortalFeed } from "#modules/portal-feed/service.js";
import { Sinks } from "#modules/sinks/service.js";
import { Journeys } from "#modules/journeys/service.js";
import { Worlds } from "#modules/world/service.js";
import { Impact } from "#modules/impact/service.js";
import { ProveFailed, type ProveApi } from "./types.ts";
import { handlerHashes } from "#modules/verdicts/internal/proof.js";
import { closing, exercise } from "./internal/exercise.ts";
import { PORTAL_HISTORY_MS, PORTAL_WINDOW_MS, standWorld } from "./internal/stand.ts";
import { Warm } from "#modules/warm/service.js";
import { fingerprint } from "#modules/warm/internal/source.js";
import { proveInTest } from "./internal/test-run.ts";
import { emptyWorld } from "./internal/empty-world.ts";
import { proveReport } from "./internal/structured.ts";
import { detail, headline, narrowed } from "./internal/changed-run.ts";
import { provedAt } from "./internal/staged.ts";

const failed = (e: { readonly message: string }) => new ProveFailed({ message: e.message });

/** The compiled model and the project's journeys, or why prove can't run. */
const load = (root: string, empty = false) =>
  Effect.gen(function* () {
    const model = yield* Compiler.model.pipe(
      Effect.provide(nodeSource(root)),
      Effect.mapError((e) => new ProveFailed({ message: e._tag === "BlueprintInvalid" ? `the blueprint is invalid:\n  - ${e.problems.join("\n  - ")}` : e.message })),
    );
    const project = yield* Journeys.load(root, model).pipe(Effect.mapError(failed));
    if (project.journeys.length === 0 && !empty) return yield* new ProveFailed({ message: `no journeys in ${resolve(root, "journeys")}` });
    return { model, project };
  });

/** One line per journey skipped for its blanks, so a stub is never silently counted as proved. */
const unfinishedIn = (project: { readonly unfinished?: ReadonlyArray<string> }) =>
  (project.unfinished ?? []).map((file) => `journey ${file} skipped: it still has blanks (ortho check names them)`);

export const Prove: ProveApi = {
  run: ({ root, port, empty = false, only, env, changed = false, say }) =>
    Effect.gen(function* () {
      const { model, project: loaded } = yield* load(root, empty);
      // `--changed`: what the last proof's record and today's files say to run; with nothing to run or judge, no world is made at all.
      // What a proof rests on is read once, before anything runs, and is what the run is recorded against.
      const stamp = !empty && only === undefined ? yield* Impact.stamp(root, model) : undefined;
      const selection = changed && stamp !== undefined ? yield* Impact.select(root, model, stamp) : undefined;
      const judging = selection !== undefined && selection.fellBack === null ? new Set(selection.judge) : undefined;
      const project = selection !== undefined && judging !== undefined ? narrowed(loaded, selection.rerun) : loaded;
      const said = selection === undefined ? [] : headline(model, selection, project.journeys.length, loaded.journeys.length);
      if (say !== undefined) for (const line of said) yield* say(line);
      const report = selection === undefined ? undefined : detail(model, selection, project.journeyFiles ?? []);
      if (selection !== undefined && judging !== undefined && project.journeys.length === 0 && judging.size === 0) {
        yield* Impact.settle(root, model, { journeys: [], operations: [] }, stamp!);
        const lines = [...said, ...unfinishedIn(loaded), "prove ✔"];
        return { lines, passed: true, structured: proveReport([], 0, 0, lines, true, report), ...(say === undefined ? {} : { said: said.length }) };
      }
      const journeys = only === undefined ? project.journeys : project.journeys.filter((journey) => journey.name === only);
      if (journeys.length === 0 && !(empty && only === undefined) && !(judging !== undefined && judging.size > 0)) return yield* new ProveFailed({ message: `no journey named "${only}"` });
      const bodies = handlerHashes(root, model);
      const world = empty ? yield* emptyWorld(root, model) : root;
      const stand = yield* standWorld({ root, world, model, port, empty, env });
      const [took, done] = yield* Effect.timed(exercise(model, { ...project, journeys }, stand.url, stand.collector, undefined, stand.otlp, undefined, empty, bodies, stand.device, judging));
      // A run with a failing journey proves nothing: its operations are recorded as judged and not passed (D2 #80).
      if (stamp !== undefined) {
        yield* Impact.record(root, model, done.judged, judging === undefined ? done.results : done.results.filter((r) => judging.has(r.operation)));
        yield* Impact.settle(root, model, {
          journeys: done.journeys.details.flatMap((d, i) => (project.journeyFiles?.[i] === undefined ? [] : [{ file: project.journeyFiles[i]!, passed: d.verdict === "pass" }])),
          operations: [...new Set(done.judged.flatMap((v) => (v.operation === undefined ? [] : [v.operation])))].map((operation) => ({ operation, passed: done.judged.every((v) => v.operation !== operation || v.failures.length === 0) })),
        }, stamp);
      }
      const verdict = closing(done);
      const lines = [...said, ...stand.notes, ...unfinishedIn(loaded), ...done.journeys.lines, ...done.evals.lines, verdict.line];
      const seconds = Math.round(Duration.toMillis(took)) / 1000;
      return { lines, passed: verdict.passed, structured: proveReport(done.journeys.details, done.evals.failed, seconds, lines, verdict.passed, report), ...(say === undefined ? {} : { said: said.length }) };
    }),
  dev: ({ root, port, env, pid }) =>
    Effect.gen(function* () {
      const startedAt = yield* Clock.currentTimeMillis;
      const sources = fingerprint(root);
      const nonce = randomBytes(16).toString("hex");
      const model = yield* Compiler.model.pipe(Effect.provide(nodeSource(root)), Effect.mapError((e) => failed(e._tag === "BlueprintInvalid" ? { message: `the blueprint is invalid:\n  - ${e.problems.join("\n  - ")}` } : e)));
      const sinks = yield* Sinks.resolve({ sinks: model.environments?.["local"]?.telemetry ?? [{ sink: "local" }], env: env ?? {} });
      // The collector and the world outlive each prove: a prove that finds them uses them (ST1.24).
      const dir = resolve(root, Names.folder, "dev-telemetry");
      const collector = yield* Collectors.local(dir, privateKeys(model)).pipe(Effect.mapError(failed));
      const feed = yield* PortalFeed.serve({ source: collector, metrics: FileMetrics.open(dir), environment: "local", windowMs: PORTAL_WINDOW_MS, historyMs: PORTAL_HISTORY_MS }).pipe(Effect.mapError(failed));
      const { url, log } = yield* Worlds.start({ root, port, name: "dev", otlp: collector.url, portalFeed: feed.url, environment: "local", secretEnv: sinks.secretEnv, nonce }).pipe(Effect.mapError(failed));
      yield* Warm.publish(root, { pid, url, collector: collector.url, telemetry: dir, startedAt, sources, nonce }).pipe(Effect.mapError(failed));
      return { url, log, notes: sinks.notes };
    }),
  test: (options) =>
    load(options.root).pipe(Effect.flatMap(({ model, project }) => proveInTest(model, project, options))),
  staged: ({ root, url, label, only, d1 }) =>
    load(root).pipe(Effect.flatMap(({ model, project }) => provedAt(model, project, url, label, only ?? [], d1 === undefined ? undefined : Journeys.d1Facts(d1)))),
  against: ({ root, url, telemetry, state, say }) =>
    Effect.gen(function* () {
      const { model, project } = yield* load(root);
      const done = yield* exercise(model, project, url, Collectors.read(telemetry), "sign-up", undefined, state === undefined ? undefined : Journeys.databaseFacts(state));
      for (const line of [...unfinishedIn(project), ...done.journeys.lines, ...done.evals.lines]) yield* say(line);
      const verdict = closing(done);
      yield* say(verdict.line);
      return { passed: verdict.passed, results: done.results };
    }),
};
