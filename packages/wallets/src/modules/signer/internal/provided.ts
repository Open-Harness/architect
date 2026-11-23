// A signer whose keys a browser's wallet holds, reached through EIP-1193 (`window.ethereum`). The wallet has no names for
// its accounts, so the signer keeps a book of labels: which account each label means. A key never passes through here.
import { Effect, Option, Redacted } from "effect";
import { Keys, type Address, type Hash } from "@orthograph/chain-evm/device";
import { NoSuchKey } from "../../../../blueprint/things/wallet/errors.js";
import { Account } from "../../account/service.ts";
import { Chain } from "../../chain/service.ts";
import { Submit } from "../../submit/service.ts";
import type { ChainSetting } from "../../chain/types.ts";
import type { Hand } from "../../submit/types.ts";
import type { Eip1193, Held, LabelBook, Signer, SignerName } from "../types.ts";
import { locked } from "./keyed.ts";

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
const hex = (bytes: Uint8Array) => `0x${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}`;
const quantity = (n: bigint) => `0x${n.toString(16)}`;

/** The provider's own refusals: EIP-1193's 4001 (the person said no) and 4100 (not authorised). */
const declined = (error: unknown) => typeof error === "object" && error !== null && [4001, 4100].includes((error as { code?: number }).code ?? 0);

export const provided = (name: SignerName, chain: ChainSetting, provider: Eip1193, labels: LabelBook): Signer => {
  // One port for this signer, made on its first send: every send shares its nonce lane.
  const port = Chain.shared(chain);
  const ask = (method: string, params: ReadonlyArray<unknown> = []) =>
    Effect.tryPromise({ try: () => provider.request({ method, params }), catch: (error) => error }).pipe(
      Effect.catch((error) => (declined(error) ? locked(`the wallet declined ${method}`) : Effect.die(new Error(`the wallet's provider failed ${method}`)))),
    );
  const accounts = (method: "eth_accounts" | "eth_requestAccounts") =>
    ask(method).pipe(Effect.map((found) => (Array.isArray(found) ? found.filter((a): a is Address => typeof a === "string" && Keys.isAddress(a)) : [])));

  const held = Effect.gen(function* () {
    const book = yield* labels.read;
    const have = yield* accounts("eth_accounts");
    return Object.entries(book).filter(([, address]) => have.some((a) => same(a, address))).map(([label, address]): Held => ({ label, address: address as Address }));
  });
  const bind = (label: string, address: Address) =>
    Effect.gen(function* () {
      const book = yield* labels.read;
      yield* labels.write({ ...book, [label]: address });
      return { label, address } satisfies Held;
    });
  const addressOf = (label: string) =>
    Effect.gen(function* () {
      const found = (yield* held).find((h) => h.label === label);
      if (found === undefined) return yield* Effect.logInfo(`no account labelled ${label} on the ${name} signer`).pipe(Effect.andThen(Effect.fail(new NoSuchKey({}))));
      return found.address;
    });

  return {
    name,
    chain,
    // A wallet cannot be made a key: the next account it offers that has no label is the new key.
    create: (label) =>
      Effect.gen(function* () {
        const found = (yield* held).find((h) => h.label === label);
        if (found !== undefined) return found;
        const book = yield* labels.read;
        const offered = yield* accounts("eth_requestAccounts");
        const next = offered.find((a) => !Object.values(book).some((b) => same(a, b)));
        if (next === undefined) return yield* locked("the wallet has no further account to give: make one in the wallet, then create it here");
        return yield* bind(label, next);
      }),
    import: (label, source) =>
      Effect.gen(function* () {
        const parsed = Account.parse(Redacted.value(source), chain.chainId);
        if (Option.isNone(parsed)) return yield* locked("a browser signer imports an account its wallet holds, written eip155:<chain>:<address>");
        const offered = yield* accounts("eth_requestAccounts");
        const address = offered.find((a) => same(a, parsed.value.address));
        if (address === undefined) return yield* locked("the wallet does not hold that account");
        const found = (yield* held).find((h) => h.label === label);
        if (found !== undefined && !same(found.address, address)) return yield* locked(`the label ${label} already means another account`);
        return found ?? (yield* bind(label, address));
      }),
    keys: held,
    sign: (label, message) =>
      Effect.gen(function* () {
        const address = yield* addressOf(label);
        const signature = yield* ask("personal_sign", [hex(new TextEncoder().encode(message)), address]);
        if (typeof signature !== "string" || !/^0x[0-9a-fA-F]{130}$/.test(signature)) return yield* Effect.die(new Error("the wallet answered personal_sign with no signature"));
        return signature as `0x${string}`;
      }),
    send: (label, to, value) =>
      Effect.gen(function* () {
        const address = yield* addressOf(label);
        const hand: Hand = (target, amount) =>
          Effect.gen(function* () {
            // Asked here, right before the send, so a network switch while the transfer was simulated is caught.
            const walletChain = yield* ask("eth_chainId");
            if (typeof walletChain !== "string" || !/^0x[0-9a-fA-F]+$/.test(walletChain)) return yield* Effect.die(new Error("the wallet's provider answered eth_chainId with no chain id"));
            if (BigInt(walletChain) !== BigInt(chain.chainId)) {
              return yield* locked(`the wallet is on chain ${BigInt(walletChain)}, and this wallet sends on ${chain.chainId}: switch the wallet's network`);
            }
            const before = yield* ask("eth_blockNumber");
            const hash = yield* ask("eth_sendTransaction", [{ from: address, to: target, value: quantity(amount) }]);
            if (typeof hash !== "string" || typeof before !== "string") return yield* Effect.die(new Error("the wallet's provider answered eth_sendTransaction with no hash"));
            const sent = (yield* ask("eth_getTransactionByHash", [hash])) as { readonly nonce?: string } | null;
            return { hash: hash as Hash, nonce: Number(BigInt(sent?.nonce ?? "0x0")), fromBlock: BigInt(before) };
          });
        return yield* Submit.withProvider(chain, port, address, to, value, hand);
      }),
  };
};

