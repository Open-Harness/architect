import { Effect, Exit, Scope } from "effect";
import type { Timers } from "@orthograph/language-effect";
import type { Closed } from "../types.ts";
import type { Live, Shared } from "./live.ts";
import { readHits } from "./hits.ts";
import { killGroup } from "./spawn.ts";

/** End one sandbox: its running commands killed by group, its daemon stopped and waited for, its socket closed, its folders removed. */
const end = (shared: Shared, live: Live): Effect.Effect<number, never, Timers> =>
  Effect.gen(function* () {
    yield* readHits(shared, live);
    live.state = "closed";
    const pids = [...live.running];
    yield* Effect.forEach(pids, killGroup, { discard: true });
    live.running.clear();
    const daemon = live.relay.alive() ? 1 : 0;
    yield* Scope.close(live.scope, Exit.void);
    return pids.length + daemon;
  });

/** Close a sandbox; one already closed, swept or never opened answers `closed: false`, so a retry is safe. */
export const closeSandbox = (shared: Shared, id: string): Effect.Effect<Closed, never, Timers> =>
  Effect.gen(function* () {
    const live = shared.all.get(id);
    if (live === undefined || live.state !== "open") return { closed: false, killed: 0 };
    return { closed: true, killed: yield* end(shared, live) };
  });

/** Close every open sandbox. */
export const closeAll = (shared: Shared): Effect.Effect<void, never, Timers> =>
  Effect.forEach([...shared.all.values()].filter((l) => l.state === "open"), (live) => end(shared, live), { discard: true });
