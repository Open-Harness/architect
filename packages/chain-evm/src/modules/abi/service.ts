import { decodeResult, encodeCall, encodeDeploy } from "./internal/codec.ts";
import { errorSignature, selectorOf } from "./internal/signature.ts";
import type { AbiApi } from "./types.ts";

export const Abi: AbiApi = {
  encodeCall,
  decodeResult,
  encodeDeploy,
  refusal: (item, code, program) => {
    const signature = errorSignature(item);
    return {
      code, name: item.name, selector: selectorOf(signature), signature, abi: item,
      ...(program === undefined ? {} : { program }),
    };
  },
};
