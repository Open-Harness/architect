import type { InvariantsApi } from "./types.ts";
import { makeUnique } from "./internal/unique.ts";

export const Invariants: InvariantsApi = {
  invariant: { unique: makeUnique as unknown as InvariantsApi["invariant"]["unique"] },
};
