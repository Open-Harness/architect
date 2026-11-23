import { Effect } from "effect";
import { Commands } from "../../commands/service.ts";
import type { Live, Shared } from "./live.ts";

/**
 * The refusals the shims have logged since last asked, now recorded in order: a blocked name run by a shell the bridge started,
 * or by a command Pi's tools sent through the daemon. Answers the new names.
 */
export const readHits = (shared: Shared, live: Live): Effect.Effect<ReadonlyArray<string>> =>
  Effect.gen(function* () {
    const names = Commands.hitsFrom(yield* shared.disk.readOrEmpty(Commands.hitsFile(live.shims)));
    const fresh = names.slice(live.hitsRead);
    live.hitsRead = names.length;
    for (const name of fresh) live.refusals.push({ name: "BlockedCommand", detail: Commands.refusalText(name) });
    return fresh;
  });
