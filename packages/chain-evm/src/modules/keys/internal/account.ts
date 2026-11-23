import { Effect } from "effect";
import { privateKeyToAccount } from "viem/accounts";
import { ChainFault } from "../../faults/types.ts";
import type { Key } from "../types.ts";

const malformed = () => new ChainFault({ kind: "signing", message: "The secret is not a secp256k1 key: 0x and 64 hex digits" });
const signing = () => new ChainFault({ kind: "signing", message: "The key could not sign" });

/** The key a secret makes, or a `ChainFault` that never holds the secret. It leaves this function only as signatures. */
export const accountOf = (secret: string): Effect.Effect<Key, ChainFault> =>
  Effect.gen(function* () {
    if (!/^0x[0-9a-fA-F]{64}$/.test(secret)) return yield* malformed();
    const account = yield* Effect.try({ try: () => privateKeyToAccount(secret as `0x${string}`), catch: malformed });
    return {
      address: account.address,
      signMessage: (message) => Effect.tryPromise({ try: () => account.signMessage({ message }), catch: signing }),
      signer: {
        address: account.address,
        signTransaction: (transaction) => Effect.tryPromise({ try: () => account.signTransaction(transaction), catch: signing }),
      },
    } satisfies Key;
  });
