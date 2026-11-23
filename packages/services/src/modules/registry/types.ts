// An npm registry on this machine: Verdaccio under Node, the pinned `verdaccio` package, as a process of the caller's scope.
import { Data, type Effect, type Scope } from "effect";
import type { ProcessFailed } from "#modules/owned/types.js";

export class RegistryFailed extends Data.TaggedError("RegistryFailed")<{ readonly message: string }> {}

export interface RegistryOptions {
  /** A folder for its storage, config, log and the throwaway user's `npmrc`. The caller made it and removes it. */
  readonly dir: string;
  /** Default: a free loopback port. */
  readonly port?: number;
}

export interface Registering {
  /** `http://127.0.0.1:<port>/`, with the trailing slash `ORTHO_REGISTRY` carries. */
  readonly url: string;
  readonly port: number;
  readonly pid: number;
  /** An npmrc holding the throwaway user's token for this registry alone, mode 0600. The token goes nowhere else. */
  readonly npmrc: string;
  readonly storage: string;
}

export interface RegistryApi {
  /**
   * Start Verdaccio and make a user on it. The project's own names (`@acme/*`, `acme`) and Orthograph's (`orthograph`,
   * `@orthograph/*`) are anyone's to read, publish and unpublish and are never proxied to npm; everything else is, so an install
   * of what was published finds its dependencies. Ready once `/-/ping` answers; stopped with the scope.
   */
  readonly start: (options: RegistryOptions) => Effect.Effect<Registering, RegistryFailed | ProcessFailed, Scope.Scope>;
}
