import type { DeclareApi } from "./types.ts";
import { sealed } from "./internal/values.ts";

export const Declares: DeclareApi = {
  declare: (thing, values) => Object.freeze({ kind: "declared", thing, values: sealed(values) }),
};
