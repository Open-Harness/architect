import type { SafeRefusalApi } from "./types.ts";

/** Empty handlers until the build lands (`refusal.test.ts`, `../world/contracts.test.ts`): nothing is typed yet. */
export const SafeRefusal: SafeRefusalApi = {
  from: (_safe, error) => error,
  typed: () => (effect) => effect,
};
