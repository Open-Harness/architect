// `ortho prove --through web` (ST1.25, K29 section 8): a journey's calls replayed through the project's generated pieces in headless Chromium.
import { Data, type Effect, type Scope } from "effect";
import type { Model } from "@orthograph/compiler";

export class WebUnavailable extends Data.TaggedError("WebUnavailable")<{ readonly message: string }> {}

/** One call a journey step makes, ready: its payload as the wire carries it, the trace the call belongs to, and who it is made as. */
export interface WebCall {
  /** `handle.claim`. */
  readonly operation: string;
  /** The payload in wire form: every value a string, as a person types it. */
  readonly wire: Readonly<Record<string, unknown>>;
  readonly trace: string;
  readonly parent: string;
  /** The session token of the cast member; empty for no one signed in. Never printed. */
  readonly token: string;
  /** The request key the step names (`{ request: … }`); absent leaves the piece's own. */
  readonly request: string | undefined;
}

/** What the world answered the browser's request, as the HTTP run records it. A call the page never sent is status 0 and says why. */
export interface WebAnswer {
  readonly status: number;
  readonly body: unknown;
}

/** A browser that replays calls through the pieces. */
export interface WebCaller {
  readonly send: (call: WebCall) => Effect.Effect<WebAnswer>;
}

export interface WebApi {
  /** A headless Chromium for the run, which the scope closes, replaying calls on the world at `url`. */
  readonly open: (options: { readonly root: string; readonly url: string; readonly model: Model; readonly name: string }) => Effect.Effect<WebCaller, WebUnavailable, Scope.Scope>;
}
