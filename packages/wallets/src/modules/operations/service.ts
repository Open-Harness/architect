import { Effect, Option, Redacted } from "effect";
import { TimersLive } from "@orthograph/language-effect/device";
import { KeyLocked, SimulationReverted } from "../../../blueprint/things/wallet/errors.js";
import { Account } from "../account/service.ts";
import { SIGNER_NAMES, type Held, type Signer } from "../signer/types.ts";
import type { OperationsApi } from "./types.ts";
import { isSigner } from "./internal/names.ts";

const accountOf = (signer: Signer, held: Held) => Account.format({ chainId: signer.chain.chainId, address: held.address });
const answerOf = (signer: Signer, held: Held) => ({ wallet: Account.idOf(held.address), account: accountOf(signer, held) });

export const Operations: OperationsApi = {
  on: (signerOf) => {
    const signerNamed = (name: string) =>
      isSigner(name) ? signerOf(name) : Effect.logInfo(`${name} is no signer: it is one of ${SIGNER_NAMES.join(", ")}`).pipe(Effect.andThen(Effect.fail(new KeyLocked({}))));
    return {
      create: ({ signer: name, label }) => Effect.flatMap(signerNamed(name), (signer) => Effect.map(signer.create(label), (held) => answerOf(signer, held))),
      import: ({ signer: name, label, source }) =>
        Effect.flatMap(signerNamed(name), (signer) => Effect.map(signer.import(label, Redacted.make(source)), (held) => answerOf(signer, held))),
      keys: ({ signer: name }) =>
        Effect.flatMap(signerNamed(name), (signer) =>
          Effect.map(signer.keys, (held) => ({ count: BigInt(held.length), accounts: held.map((h) => accountOf(signer, h)).join(",") }))),
      sign: ({ signer: name, label, message }) =>
        Effect.flatMap(signerNamed(name), (signer) => Effect.map(signer.sign(label, message), (signature) => ({ signature }))),
      send: ({ signer: name, label, to, value }) =>
        Effect.gen(function* () {
          const signer = yield* signerNamed(name);
          const target = Account.parse(to, signer.chain.chainId);
          if (Option.isNone(target) || target.value.chainId !== signer.chain.chainId) {
            return yield* Effect.logInfo(`${to} is no account on eip155:${signer.chain.chainId}, the chain this signer is on`).pipe(Effect.andThen(Effect.fail(new SimulationReverted({}))));
          }
          // A device waits on the real clock: it has no world to drive one.
          return yield* signer.send(label, target.value.address, value).pipe(Effect.provide(TimersLive));
        }),
    };
  },
};
