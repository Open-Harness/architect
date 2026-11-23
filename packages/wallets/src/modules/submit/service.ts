import { Effect, Exit } from "effect";
import type { SubmitApi } from "./types.ts";
import { depthOf, follow, refused, settle } from "./internal/flow.ts";

export const Submit: SubmitApi = {
  withKey: (setting, shared, signer, to, value) =>
    Effect.gen(function* () {
      const depth = yield* depthOf(setting);
      const port = yield* shared;
      // From the nonce's reservation to the broadcast, any exit that is not a success hands it back: a refusal, a defect or an
      // interruption. The prepare itself can be interrupted (it reserves only as its last step); the guard is in place the
      // moment it returns. `follow` is outside the span: by then the transfer is broadcast, and `release` keeps a broadcast nonce anyway.
      const submission = yield* Effect.uninterruptibleMask((restore) =>
        Effect.gen(function* () {
          const unsigned = yield* restore(port.prepare({ from: signer.address, to, value })).pipe(Effect.catch(refused));
          return yield* restore(Effect.gen(function* () {
            // A failed simulation hands the nonce back and leaves the chain as it was.
            yield* port.simulate(unsigned).pipe(Effect.catch(refused));
            const signed = yield* port.sign(unsigned, signer).pipe(Effect.catch(refused));
            return yield* port.submit(signed).pipe(Effect.catch(refused));
          })).pipe(Effect.onExit((exit) => (Exit.isSuccess(exit) ? Effect.void : settle(port, unsigned))));
        }),
      );
      return yield* follow(port, submission, depth);
    }),
  withProvider: (setting, shared, from, to, value, hand) =>
    Effect.gen(function* () {
      const depth = yield* depthOf(setting);
      const port = yield* shared;
      const unsigned = yield* port.prepare({ from, to, value }).pipe(Effect.catch(refused));
      // Only the check: the provider chooses its own nonce, so this one goes back at once.
      yield* port.simulate(unsigned).pipe(Effect.ensuring(settle(port, unsigned)), Effect.catch(refused));
      const sent = yield* hand(to, value);
      return yield* follow(port, { hash: sent.hash, from, nonce: sent.nonce, fromBlock: sent.fromBlock, to, value }, depth);
    }),
};
