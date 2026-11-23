// Asking the world's clock door over HTTP.
import { Effect } from "effect";

/** Any answer, JSON or not: the status and the text. A world that does not answer is the message of why. */
export const asked = (url: string, init?: RequestInit) =>
  Effect.tryPromise({
    try: () => fetch(url, init).then((r) => r.text().then((text) => ({ status: r.status, text }))),
    catch: (e) => (e instanceof Error ? e.message : String(e)),
  });

/** A body that is JSON is parsed; one that is not is kept as text. */
export const bodyOf = (text: string): unknown => (text === "" ? null : Effect.runSync(Effect.try(() => JSON.parse(text) as unknown).pipe(Effect.orElseSucceed(() => text))));
