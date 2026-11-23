import { Effect, Redacted } from "effect";
import { getAddress, hexToBytes, isAddress, keccak256 } from "viem";
import { generatePrivateKey } from "viem/accounts";
import type { KeysApi } from "./types.ts";
import { accountOf } from "./internal/account.ts";

export const Keys: KeysApi = {
  generate: Effect.sync(() => Redacted.make(generatePrivateKey())),
  fromSecret: (secret) => accountOf(Redacted.value(secret)),
  keccak256: (bytes) => hexToBytes(keccak256(bytes)),
  isAddress: (text): text is `0x${string}` => isAddress(text),
  checksum: (address) => getAddress(address),
};
