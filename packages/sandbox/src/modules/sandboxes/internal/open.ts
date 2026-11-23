import { Effect, Exit, Scope } from "effect";
import type { Timers } from "@orthograph/language-effect";
import { Commands } from "../../commands/service.ts";
import { Environment } from "../../environment/service.ts";
import { Fence } from "../../fence/service.ts";
import { Relay } from "../../relay/service.ts";
import { SandboxLimit, type Opened, type OpenError, type OpenInput } from "../types.ts";
import { rootOf, shimsOf, type Live, type Shared } from "./live.ts";

const opened = (live: Live): Opened => ({ sandbox: live.id, address: live.relay.address, root: live.root });

/** One sandbox per (owner, tag): a retry finds it. A new one is a folder, a shims folder, and a pi-env daemon with its socket, all of one scope. */
export const openSandbox = (shared: Shared, input: OpenInput): Effect.Effect<Opened, OpenError, Timers> =>
  Effect.gen(function* () {
    const { config, disk, all } = shared;
    const live = [...all.values()].filter((l) => l.state === "open");
    const found = live.find((l) => l.owner === input.owner && l.tag === input.tag);
    if (found !== undefined) return opened(found);
    if (live.length >= config.limit) return yield* Effect.fail(new SandboxLimit({ open: live.length }));

    const id = config.ids.id();
    const root = rootOf(config, id);
    const shims = shimsOf(config, id);
    const env = yield* Environment.of({ owner: input.owner, tag: input.tag, root, blocked: input.blocked, variables: input.variables });
    const scope = yield* Scope.make();
    // Added first, so it runs last: the daemon is stopped before its folder goes.
    yield* Scope.addFinalizer(scope, Effect.all([disk.remove(root), disk.remove(shims)], { discard: true }));

    const execs: Live["execs"] = [];
    const refusals: Live["refusals"] = [];
    return yield* Effect.gen(function* () {
      yield* Commands.install(disk, shims, input.blocked);
      yield* disk.makeDir(`${root}/.tmp`);
      const fence = yield* Fence.of(disk, root);
      const processEnv = Environment.processEnv(env, { root, shims, systemPath: config.systemPath });
      const relay = yield* Relay.start({
        binary: config.daemon, cwd: root, env: processEnv, token: config.ids.token(), blocked: input.blocked, fence,
        observe: {
          refused: (r) => Effect.sync(() => { if (r.name === "BlockedCommand" || refusals.at(-1)?.detail !== r.detail) refusals.push(r); }),
          started: (words) => Effect.sync(() => execs.push({ command: words, exit: null, lent: [] }) - 1),
          exited: (handle, exit) => Effect.sync(() => { const e = execs[handle]; if (e !== undefined) e.exit = exit; }),
        },
      }).pipe(Scope.provide(scope));
      const sandbox: Live = { id, owner: input.owner, tag: input.tag, root, shims, env, blocked: input.blocked, fence, scope, relay, processEnv, execs, refusals, loans: [], running: new Set(), hitsRead: 0, state: "open" };
      all.set(id, sandbox);
      return opened(sandbox);
    }).pipe(Effect.tapError(() => Scope.close(scope, Exit.void)));
  });
