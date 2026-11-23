import { Effect, Semaphore } from "effect";
import { Timers } from "@orthograph/language-effect";
import type { SandboxesFactory } from "./types.ts";
import { pgidsFile, type Live, type Shared } from "./internal/live.ts";
import { killGroup } from "./internal/spawn.ts";
import { closeAll, closeSandbox } from "./internal/close.ts";
import { execIn } from "./internal/exec.ts";
import { readIn, writeIn } from "./internal/files.ts";
import { openSandbox } from "./internal/open.ts";
import { leftIn, listIn, seenIn } from "./internal/report.ts";

export const Sandboxes: SandboxesFactory = {
  make: (config) =>
    Effect.gen(function* () {
      const timers = yield* Timers;
      const shared: Shared = { config, disk: config.disk, all: new Map<string, Live>() };
      // Opening is one at a time, so two opens of one (owner, tag) find the one sandbox and the limit holds.
      const turn = yield* Semaphore.make(1);
      const provide = <A, E>(effect: Effect.Effect<A, E, Timers>): Effect.Effect<A, E> => Effect.provideService(effect, Timers, timers);
      const sweep = Effect.gen(function* () {
        yield* provide(closeAll(shared));
        // A crashed bridge's work: nothing in `<dir>/sandboxes` is anyone's once every sandbox of this one is closed. Its `exec` groups
        // are killed first (each sandbox's `.pgids` names the ones that were running when it died), then its folders removed.
        for (const name of yield* config.disk.names(`${config.dir}/shims`)) {
          const groups = (yield* config.disk.readOrEmpty(pgidsFile(`${config.dir}/shims/${name}`))).split("\n").map(Number).filter((n) => Number.isInteger(n) && n > 1);
          yield* Effect.forEach(groups, killGroup, { discard: true });
        }
        for (const name of yield* config.disk.names(`${config.dir}/sandboxes`)) yield* config.disk.remove(`${config.dir}/sandboxes/${name}`);
        for (const name of yield* config.disk.names(`${config.dir}/shims`)) yield* config.disk.remove(`${config.dir}/shims/${name}`);
      });
      yield* sweep;
      return {
        open: (input) => turn.withPermits(1)(provide(openSandbox(shared, input))),
        close: (id) => turn.withPermits(1)(provide(closeSandbox(shared, id))),
        exec: (input) => provide(execIn(shared, input)),
        write: (input) => writeIn(shared, input),
        read: (input) => readIn(shared, input),
        list: (input) => Effect.sync(() => listIn(shared, input.tag)),
        seen: (input) => seenIn(shared, input.sandbox),
        left: leftIn(shared),
        sweep,
      };
    }),
};
