// `ortho prove --env staging --run <id>`: the journeys, judged against a Worker that is already deployed, in no world of the run's own.
import { Duration, Effect } from "effect";
import type { Model } from "@orthograph/compiler";
import { Journeys } from "#modules/journeys/service.js";
import type { Facts, Project } from "#modules/journeys/types.js";
import { ProveFailed, type Report } from "../types.ts";
import { journeyLines } from "./report.ts";
import { proveReport } from "./structured.ts";

/**
 * The address answers, and it is the project's server: Better Auth's own health route is not a 404. A Worker that was never deployed
 * answers 404 to every route; nothing listening is no answer at all. One GET, so no operation is asked before the story runs.
 */
const answers = (url: string): Effect.Effect<boolean> =>
  Effect.promise(() => fetch(`${url}/api/auth/ok`, { signal: AbortSignal.timeout(15_000) }).then((r) => r.status !== 404, () => false));

export const provedAt = (model: Model, project: Project, url: string, label: string, only: string | undefined, facts?: Facts): Effect.Effect<Report, ProveFailed> =>
  Effect.gen(function* () {
    const journeys = only === undefined ? project.journeys : project.journeys.filter((journey) => journey.name === only);
    if (journeys.length === 0) return yield* new ProveFailed({ message: `no journey named "${only}"` });
    if (!(yield* answers(url))) return yield* new ProveFailed({ message: `nothing answers as the project's server at ${url} (${label}): it was not deployed, or it is not up` });
    const [took, runs] = yield* Effect.timed(Effect.forEach(journeys, (journey, i) => Journeys.run(project, url, journey, i, "sign-up", facts)));
    const done = journeyLines(runs, new Map(), false, model, false);
    const lines = [...done.lines, done.failed === 0 ? "prove ✔" : `prove ✘ ${done.failed} failing`];
    const passed = done.failed === 0;
    return { lines, passed, structured: proveReport(done.details, 0, Math.round(Duration.toMillis(took)) / 1000, lines, passed) };
  }).pipe(Effect.catchDefect((defect) => Effect.fail(new ProveFailed({ message: defect instanceof Error ? defect.message : `the run could not be judged (${label})` }))));
