// Ask #471 (empty handlers): every function is here and typed, and none is built.
import { Effect } from "effect";
import type { AbiApi } from "./types.ts";

export const Abi: AbiApi = {
  encodeCall: () => Effect.die("Ask #471: Abi.encodeCall is not built"),
  decodeResult: () => Effect.die("Ask #471: Abi.decodeResult is not built"),
  encodeDeploy: () => Effect.die("Ask #471: Abi.encodeDeploy is not built"),
  refusal: (item, code, program) => ({
    code, name: "", selector: "0x00000000", signature: "", abi: item, ...(program === undefined ? {} : { program }),
  }),
};
