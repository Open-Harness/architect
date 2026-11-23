import { Effect, Option } from "effect";
import { Timers } from "@orthograph/language-effect";
import { createPublicClient, http } from "viem";
import { AnvilFailed } from "../types.ts";
import { hasExited, type Spawned } from "./process.ts";

/** Wait until `eth_chainId` answers with the chain the world asked for. Gives up when Anvil exits or after 10 s. */
export const untilReady = (rpcUrl: string, chainId: number, anvil: Spawned) =>
  Effect.gen(function* () {
    const timers = yield* Timers;
    const client = createPublicClient({ transport: http(rpcUrl, { retryCount: 0, timeout: 500 }) });
    for (let attempt = 0; attempt < 400; attempt++) {
      const failure = anvil.failure();
      if (failure !== undefined) return yield* new AnvilFailed({ message: failure });
      if (anvil.child.pid === undefined) return yield* new AnvilFailed({ message: "the anvil binary was not found or could not start" });
      if (hasExited(anvil.child)) return yield* new AnvilFailed({ message: "anvil exited before it answered" });
      const answered = yield* Effect.tryPromise({ try: () => client.getChainId(), catch: () => undefined }).pipe(Effect.option);
      if (Option.isSome(answered)) {
        if (answered.value !== chainId) return yield* new AnvilFailed({ message: "something else answers on the chosen port" });
        return;
      }
      yield* timers.sleep("anvil.ready", "25 millis");
    }
    return yield* new AnvilFailed({ message: "anvil did not answer within 10 s" });
  });
