import type { SafeTxApi } from "./types.ts";

const NONE = "0x0000000000000000000000000000000000000000";

/** Empty handlers until the build lands (`safe-tx.test.ts`). */
export const SafeTx: SafeTxApi = {
  call: () => ({
    to: NONE, data: "0x", nonce: 0n, value: 0n, operation: 0, safeTxGas: 0n, baseGas: 0n, gasPrice: 0n, gasToken: NONE, refundReceiver: NONE,
  }),
  typedData: () => ({
    domain: { chainId: 0, verifyingContract: NONE }, types: { SafeTx: [] }, primaryType: "SafeTx",
    message: {
      to: NONE, data: "0x", nonce: 0n, value: 0n, operation: 0, safeTxGas: 0n, baseGas: 0n, gasPrice: 0n, gasToken: NONE, refundReceiver: NONE,
    },
  }),
  digest: () => "0x",
};
