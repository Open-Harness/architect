import type { Hold, HoldsApi } from "./types.ts";
import { listed } from "./internal/lists.ts";

export const Holds: HoldsApi = {
  hold: (thing, spec) => {
    const hold: Hold<typeof thing> = Object.freeze({
      kind: "hold",
      thing,
      key: spec.key,
      while: Object.freeze([...spec.while]),
      holds: (lists: Parameters<Hold["holds"]>[0]) => listed(hold, lists.held, lists.unheld),
    });
    return hold;
  },
};
