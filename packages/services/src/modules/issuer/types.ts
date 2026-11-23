// An OIDC issuer of our own, over `jose`: what GitHub's token issuer is to a CI job, as a process a test or a gate starts.
// It stands in for GitHub exactly as `mock-oauth2-server` did, and reads the same scenario file (a subset of its config).
import { Data, type Effect, type Scope } from "effect";
import type { ProcessFailed } from "#modules/owned/types.js";

export class IssuerFailed extends Data.TaggedError("IssuerFailed")<{ readonly message: string }> {}

/**
 * A scenario is a client id: a token request whose `requestParam` is `match` gets a token carrying `claims`. `*` matches any.
 * The claims a GitHub Actions job would carry for `ortho-logbook` are what the logbook's policy reads (D3 #8).
 */
export interface RequestMapping {
  readonly requestParam: string;
  readonly match: string;
  readonly claims: Readonly<Record<string, unknown>>;
}

export interface TokenCallback {
  /** The path the issuer answers under: its `issuer` is `<origin>/<issuerId>`. */
  readonly issuerId: string;
  /** Seconds a token lives. Default 3600. */
  readonly tokenExpiry?: number;
  readonly requestMappings?: ReadonlyArray<RequestMapping>;
}

export interface IssuerConfig {
  readonly tokenCallbacks?: ReadonlyArray<TokenCallback>;
}

export interface IssuerOptions {
  readonly config?: IssuerConfig;
  /** Default: a port from `ports`. A port given here is never swapped for another. */
  readonly port?: number;
  /** Where the issuer gets a port when `port` is not given, again for each try when the one it got was taken first. Default: a free loopback port. */
  readonly ports?: Effect.Effect<number, ProcessFailed>;
  /** A folder for its config and log. Default: a fresh one under the system's temporary folder, removed when the scope closes. */
  readonly dir?: string;
}

export interface Issuing {
  /** The issuer URL: `http://127.0.0.1:<port>/<issuerId>`. Its `iss` claim, and where `/.well-known/openid-configuration` is. */
  readonly url: string;
  readonly port: number;
  readonly pid: number;
}

export interface IssuerApi {
  /** Start the issuer as a process of the caller's scope; ready once its discovery document answers. Stopped with the scope. */
  readonly start: (options?: IssuerOptions) => Effect.Effect<Issuing, IssuerFailed | ProcessFailed, Scope.Scope>;
}
