import { Effect } from "effect";
import type { SubmitApi } from "./types.ts";
import { depthOf, follow, refused, settle } from "./internal/flow.ts";

export const Submit: SubmitApi = {
  withKey: (setting, shared, signer, to, value) =>
    Effect.gen(function* () {
      const depth = yield* depthOf(setting);
      const port = yield* shared;
      const unsigned = yield* port.prepare({ from: signer.address, to, value }).pipe(Effect.catch(refused));
      // A failed simulation hands the nonce back and leaves the chain as it was.
      yield* port.simulate(unsigned).pipe(Effect.tapError(() => settle(port, unsigned)), Effect.catch(refused));
      const signed = yield* port.sign(unsigned, signer).pipe(Effect.tapError(() => settle(port, unsigned)), Effect.catch(refused));
      const submission = yield* port.submit(signed).pipe(Effect.tapError(() => settle(port, unsigned)), Effect.catch(refused));
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
