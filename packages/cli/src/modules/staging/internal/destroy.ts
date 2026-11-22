// `destroy`: when Alchemy's state for the run is here, Alchemy destroys its stack first; then, always, the sweep deletes by name what the run's prefix owns, and nothing else.
// The sweep needs nothing from `up`, no Alchemy state and no file (spike snag 12): a destroy in another job than the `up`, after a cancelled run, has none of them and still leaves nothing.
import { existsSync } from "node:fs";
import { Effect } from "effect";
import { StagingFailed, type Credentials, type Plan, type Tools } from "../types.ts";
import { owns } from "./plan.ts";
import { alchemy, clip, inputPath, statePath } from "./stack.ts";

/** What was deleted, by kind: counts only, because the account holds other apps' names and these lines reach a public log. */
export interface Destroyed {
  readonly workers: number;
  readonly databases: number;
  /** What Alchemy's destroy did first: it had no state to read, it destroyed its stack, or it failed (with its words, redacted) and the sweep went on. */
  readonly alchemy: "no state" | "destroyed" | string;
}

export const destroy = (tools: Tools, credentials: Credentials, root: string, plan: Plan): Effect.Effect<Destroyed, StagingFailed> =>
  Effect.gen(function* () {
    // Alchemy first, only when it has state to read (without it a destroy plans no changes) and the input its stack reads. Whatever it does, the sweep runs after it.
    const stateHere = existsSync(statePath(root, plan.prefix)) && existsSync(inputPath(root, plan.prefix));
    const first = stateHere
      ? yield* alchemy(tools, credentials, root, plan.prefix, "destroy", "unused").pipe(
          Effect.map((done) => (done.status === 0 ? "destroyed" : `failed: ${clip(done.output, credentials)}`)),
          Effect.catch((e: StagingFailed) => Effect.succeed(`failed: ${clip(e.message, credentials)}`)),
        )
      : "no state";

    const account = tools.account(credentials);
    // The listing is the only source of what to delete, and `owns` the only filter: a name outside the prefix is never an argument to a delete.
    const workers = (yield* account.workers).filter((name) => owns(plan.prefix, name));
    const databases = (yield* account.databases).filter((d) => owns(plan.prefix, d.name));
    // The Workers first: a database a Worker still binds is not deleted. Every delete is tried, a failed one does not stop the rest, and the failures are reported together at the end (counts and Cloudflare's redacted words, never a name).
    const failures: string[] = [];
    const attempt = (work: Effect.Effect<void, StagingFailed>) =>
      work.pipe(Effect.match({ onFailure: (e) => { failures.push(clip(e.message, credentials)); }, onSuccess: () => undefined }));
    for (const name of workers) yield* attempt(account.deleteWorker(name));
    for (const d of databases) yield* attempt(account.deleteDatabase(d.id));
    if (failures.length > 0) {
      return yield* new StagingFailed({ message: `the sweep tried ${workers.length} Workers and ${databases.length} databases and ${failures.length} deletes failed (alchemy ${first}): ${failures.join("; ")}` });
    }
    return { workers: workers.length, databases: databases.length, alchemy: first };
  });
