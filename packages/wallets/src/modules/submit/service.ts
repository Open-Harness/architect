import { Effect, Exit } from "effect";
import { Chain } from "../chain/service.ts";
import type { SubmitApi } from "./types.ts";
import { depthOf, follow, refused, settle } from "./internal/flow.ts";

export const Submit: SubmitApi = {
  withKey: (setting, signer, to, value) =>
    Effect.gen(function* () {
      const depth = yield* depthOf(setting);
      const port = yield* Chain.port(setting);
      // One keyed send at a time per account and chain, from the nonce's reservation until the node has accepted the broadcast:
      // the next send's own port then reads a pending nonce that counts this one. `follow` waits outside the lock.
      const lock = yield* Chain.lock(setting, signer.address);
      const submission = yield* lock.withPermit(
        Effect.gen(function* () {
          const unsigned = yield* port.prepare({ from: signer.address, to, value }).pipe(Effect.catch(refused));
          // This port is thrown away after the send: a reservation not broadcast is handed back as tidiness, whatever the exit.
          return yield* Effect.gen(function* () {
            yield* port.simulate(unsigned).pipe(Effect.catch(refused));
            const signed = yield* port.sign(unsigned, signer).pipe(Effect.catch(refused));
            return yield* port.submit(signed).pipe(Effect.catch(refused));
          }).pipe(Effect.onExit((exit) => (Exit.isSuccess(exit) ? Effect.void : settle(port, unsigned))));
        }),
      );
      return yield* follow(port, submission, depth);
    }),
  withProvider: (setting, from, to, value, hand) =>
    Effect.gen(function* () {
      const depth = yield* depthOf(setting);
      const port = yield* Chain.port(setting);
      const unsigned = yield* port.prepare({ from, to, value }).pipe(Effect.catch(refused));
      // Only the check: the provider chooses its own nonce, so this one goes back at once.
      yield* port.simulate(unsigned).pipe(Effect.ensuring(settle(port, unsigned)), Effect.catch(refused));
      const sent = yield* hand(to, value);
      return yield* follow(port, { hash: sent.hash, from, nonce: sent.nonce, fromBlock: sent.fromBlock, to, value }, depth);
    }),
};
