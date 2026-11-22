// ST2.02 (empty handlers): every function is here and typed, and none is built.
import { Effect } from "effect";
import type { ContractApi } from "./types.ts";

export const Contract: ContractApi = {
  read: () => Effect.die("ST2.02: not built"),
  write: () => Effect.die("ST2.02: not built"),
  refusals: () => Effect.die("ST2.02: not built"),
};
