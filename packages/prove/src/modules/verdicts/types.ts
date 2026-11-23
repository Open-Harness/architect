// Verdicts as the logbook takes them: a signed token from an OIDC issuer, and one POST per operation (D3 #8, #31).
import { Data, type Effect, type Redacted } from "effect";

/** The process environment, as only an entry file reads it. */
export type Env = Readonly<Record<string, string | undefined>>;

export class VerdictsFailed extends Data.TaggedError("VerdictsFailed")<{ readonly message: string }> {}

/** Where the token that signs a write to the logbook comes from. */
export type TokenSource =
  /** A token already in hand (`ORTHO_LOGBOOK_TOKEN`): another job's, or one a person minted. */
  | { readonly kind: "given"; readonly token: Redacted.Redacted<string> }
  /** An OIDC server that mints a token for a client (the local issuer, `ci-main`): client credentials. */
  | { readonly kind: "issuer"; readonly issuer: string; readonly client: string }
  /** The CI job's own token: GitHub Actions' request URL and the bearer that asks for it (`id-token: write`). */
  | { readonly kind: "github"; readonly requestUrl: string; readonly requestToken: Redacted.Redacted<string> };

export interface JourneyVerdict {
  readonly journey: string;
  readonly modelHash: string;
  /** Reads have no handler. */
  readonly handlerHash: string | null;
  readonly verdict: "pass" | "fail";
}

export interface Result {
  readonly operation: string;
  readonly verdict: "pass" | "fail";
  readonly journeys?: ReadonlyArray<JourneyVerdict>;
}

/** A verdict as the logbook holds it (D3 #31): the fields a gate reads. */
export interface Held {
  readonly revision: string;
  readonly environment: string;
  readonly operation: string;
  readonly verdict: string;
  readonly ref: string;
  /** The signed proof's bundle. Legacy rows may omit it or hold null. */
  readonly sha256?: string | null;
  readonly journeys?: ReadonlyArray<JourneyVerdict> | null;
}

export interface VerdictsApi {
  /**
   * The one place a write's token source is decided, for verdicts and releases alike: `ORTHO_LOGBOOK_TOKEN` when set,
   * else the local issuer (`ORTHO_OIDC_ISSUER`, client `ORTHO_OIDC_CLIENT`, default `ci-main`), else the CI job's own
   * (`ACTIONS_ID_TOKEN_REQUEST_URL` and `_TOKEN`, which needs `id-token: write`).
   */
  readonly sourceOf: (env: Env) => Effect.Effect<TokenSource, VerdictsFailed>;
  /** A token for audience `ortho-logbook`. Redacted: it is never printed, logged or put in an error. */
  readonly mint: (source: TokenSource) => Effect.Effect<Redacted.Redacted<string>, VerdictsFailed>;
  /** One `POST <logbook>/verdicts` per result, in order; the first the logbook refuses stops it. */
  readonly post: (options: {
    readonly logbook: string;
    readonly token: Redacted.Redacted<string>;
    readonly revision: string;
    readonly environment: string;
    /** Omitted only by compatibility callers; such rows cannot authorize a promotion. */
    readonly sha256?: string;
    readonly results: ReadonlyArray<Result>;
  }) => Effect.Effect<void, VerdictsFailed>;
  /** The newest verdict of each operation among those posted from `ref` for `revision` in `environment` (`GET /verdicts/latest`, D3 #31). */
  readonly latest: (options: {
    readonly logbook: string;
    readonly revision: string;
    readonly environment: string;
    readonly ref: string;
  }) => Effect.Effect<ReadonlyArray<Held>, VerdictsFailed>;
}
