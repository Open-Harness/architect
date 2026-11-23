import type { DeclareApi } from "./types.ts";

export const Declares: DeclareApi = {
  declare: (thing, values) => Object.freeze({ kind: "declared", thing, values }),
};
