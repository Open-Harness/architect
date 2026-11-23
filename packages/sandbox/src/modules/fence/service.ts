import { resolve } from "node:path";
import { Effect } from "effect";
import { OutsideSandbox, type FenceApi } from "./types.ts";
import { isUnder, landing } from "./internal/resolve.ts";

export const Fence: FenceApi = {
  of: (disk, root) =>
    Effect.gen(function* () {
      const real = (yield* disk.realpath(root)) ?? root;
      return {
        root,
        check: (target) =>
          Effect.gen(function* () {
            const absolute = resolve(root, target);
            const resolved = yield* landing(disk, absolute);
            return isUnder(resolved, real) ? absolute : yield* Effect.fail(new OutsideSandbox({ path: target, root, resolved }));
          }),
      };
    }),
  refusalText: (refusal) => `OutsideSandbox: ${refusal.path} is outside ${refusal.root}`,
};
