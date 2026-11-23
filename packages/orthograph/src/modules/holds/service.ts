import type { Hold, HoldsApi } from "./types.ts";

export const Holds: HoldsApi = {
  hold: (thing, spec) => {
    const hold: Hold<typeof thing> = Object.freeze({
      kind: "hold",
      thing,
      key: spec.key,
      while: Object.freeze([...spec.while]),
      holds: (lists: Parameters<Hold["holds"]>[0]) => Object.freeze({ kind: "holds", hold, held: Object.freeze([...lists.held]), unheld: Object.freeze([...lists.unheld]) }),
    });
    return hold;
  },
};
