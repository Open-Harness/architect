import { Data, type Effect } from "effect";
import type { SandboxesApi } from "../sandboxes/types.ts";

/** A request that does not decode: what was wrong with it. */
export class BadRequest extends Data.TaggedError("BadRequest")<{ readonly what: string }> {}

export interface BridgeRequest {
  readonly method: string;
  /** The path, without a query. */
  readonly path: string;
  /** The parsed JSON body, or undefined when there was none. */
  readonly body: unknown;
}

export interface BridgeResponse {
  readonly status: number;
  readonly body: unknown;
}

export interface BridgeApi {
  readonly handle: (request: BridgeRequest) => Effect.Effect<BridgeResponse>;
}

export interface BridgeFactory {
  readonly of: (sandboxes: SandboxesApi) => BridgeApi;
}
