// `ortho prove --env staging --run <id>`: the journeys, judged against a Worker that is already deployed, in no world of the run's own.
import { Duration, Effect } from "effect";
import type { Model } from "@orthograph/compiler";
import { Journeys } from "#modules/journeys/service.js";
import type { Facts, Project } from "#modules/journeys/types.js";
import { ProveFailed, type Report } from "../types.ts";
import { chosen, noJourney, unknownOf } from "./only.ts";
import { journeyLines } from "./report.ts";
import { proveReport } from "./structured.ts";

/**
 * The address answers, and it is the project's server: Better Auth's own health route is not a 404. A Worker that was never deployed
 * answers 404 to every route; nothing listening is no answer at all. One GET, so no operation is asked before the story runs.
 */
const answers = (url: string): Effect.Effect<boolean> =>
  Effect.promise(() => fetch(`${url}/api/auth/ok`, { signal: AbortSignal.timeout(15_000) }).then((r) => r.status !== 404, () => false));

/**
 * The journeys named in `only` (every one when it is empty), each once and in file order; the first name that is no journey is refused
 * before the address is asked anything. Every chosen journey runs, a failing one too, and the verdict is all of theirs (CX-staging).
 */
export const provedAt = (model: Model, project: Project, url: string, label: string, only: ReadonlyArray<string>, facts?: Facts): Effect.Effect<Report, ProveFailed> =>
  Effect.gen(function* () {
    const unknown = unknownOf(project, only);
    if (unknown !== undefined) return yield* new ProveFailed({ message: noJourney(unknown) });
    const journeys = only.length === 0 ? project.journeys : chosen(project, only).journeys;
    if (journeys.length === 0) return yield* new ProveFailed({ message: "the project declares no journeys" });
    if (!(yield* answers(url))) return yield* new ProveFailed({ message: `nothing answers as the project's server at ${url} (${label}): it was not deployed, or it is not up` });
    const [took, runs] = yield* Effect.timed(Effect.forEach(journeys, (journey, i) => Journeys.run(project, url, journey, i, "sign-up", facts)));
    const done = journeyLines(runs, new Map(), false, model, false);
    const lines = [...done.lines, done.failed === 0 ? "prove ✔" : `prove ✘ ${done.failed} failing`];
    const passed = done.failed === 0;
    return { lines, passed, structured: proveReport(done.details, 0, Math.round(Duration.toMillis(took)) / 1000, lines, passed) };
  }).pipe(Effect.catchDefect((defect) => Effect.fail(new ProveFailed({ message: defect instanceof Error ? defect.message : `the run could not be judged (${label})` }))));
