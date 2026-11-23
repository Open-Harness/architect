import { resolve } from "node:path";
import { Effect } from "effect";
import { chromium } from "playwright";
import { replay } from "./internal/drive.ts";
import { bundle, planOf, sceneSource, type Bundle } from "./internal/scene.ts";
import { WebUnavailable, type WebApi } from "./types.ts";

export const Web: WebApi = {
  open: ({ root: given, url, model, name }) =>
    Effect.gen(function* () {
      const root = resolve(given);
      const browser = yield* Effect.acquireRelease(
        Effect.tryPromise({ try: () => chromium.launch({ headless: true }), catch: (cause) => new WebUnavailable({ message: `--through web needs Chromium and couldn't start it (npx playwright install chromium): ${cause instanceof Error ? cause.message : String(cause)}` }) }),
        (launched) => Effect.promise(() => launched.close().catch(() => undefined)),
      );
      // One scene for each operation a journey calls, bundled the first time it is called.
      const scenes = new Map<string, Bundle>();
      return {
        send: (call) =>
          Effect.gen(function* () {
            const plan = planOf(model, call.operation);
            if (plan === undefined) return { status: 0, body: { web: `${call.operation} is not an operation of the model` } };
            const known = scenes.get(call.operation);
            const scene = known ?? (yield* bundle(root, sceneSource(root, name, plan)));
            scenes.set(call.operation, scene);
            return yield* replay(browser, url, scene, plan, call);
          }).pipe(Effect.catch((problem: WebUnavailable) => Effect.succeed({ status: 0, body: { web: problem.message } }))),
      };
    }),
};
