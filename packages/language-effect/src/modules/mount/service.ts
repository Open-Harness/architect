import { Effect } from "effect";
import { Mounts } from "orthograph/server";
import { Mounted, type MountApi } from "./types.ts";
import { noMount } from "./internal/none.ts";

export const Mount: MountApi = {
  picked: (option) => Effect.gen(function* () {
    const mount = yield* Mounted;
    return Mounts.picked(mount ?? noMount, option);
  }),
  under: (mount) => (effect) => Effect.provideService(effect, Mounted, mount),
  serving: (mount, handler) => (...args) => Effect.provideService(handler(...args), Mounted, mount),
};
