// Environments: somewhere the application runs. One file per environment in `blueprint/environments/`, named by its path.
import type { Duration } from "effect";
import type { ChainNetwork, ChainToken } from "#modules/chains/types.js";
import type { CloudProvider, Database } from "#modules/cloud/types.js";
import type { Deployment, Publication } from "#modules/deploy/types.js";
import type { Identity } from "#modules/identity/types.js";
import type { Via } from "#modules/plugins/types.js";
import type { SecretDeclaration } from "#modules/secrets/types.js";
import type { Sink } from "#modules/telemetry/types.js";
import type { Clock } from "#modules/time/types.js";

export interface EnvironmentSpec {
  /** How it runs, in words. */
  readonly runs: string;
  /** A test environment's worlds are created and destroyed as one unit, and expire after this. */
  readonly lifetime?: Duration.Input;
  /** @deprecated Replaced by `issues` (M2-auth, "Smaller calls" 4); kept until every app has moved. */
  readonly identity?: Identity;
  /** The ways in this environment issues credentials for. Absent: every way in, and a world mints each for a journey. */
  readonly issues?: ReadonlyArray<Via>;
  /** How its worlds tell time: `Blueprint.clock.real()`, `.stepped({ starts })` or `.scaled({ starts })` (K23 section 1). Absent: not declared. */
  readonly clock?: Clock;
  /** Where its state lives when a cloud holds it. */
  readonly cloud?: CloudProvider;
  /** Where it lives locally. */
  readonly database?: Database;
  /**
   * Only the stores that differ from the default: each names a declared store (`blueprint/stores/<name>.ts`) and where
   * it lives here. The compiler refuses a name that isn't a store. By default every store gets its own database.
   */
  readonly stores?: Readonly<Record<string, Database | ChainNetwork>>;
  /**
   * Which contract each fixed token asset is, by asset name and then by chain store: `usdc: { budgets: Chain.evm.token("0x…") }`
   * (M6-money item 2). Every chain store whose things use a fixed token asset must have it bound here.
   */
  readonly assets?: Readonly<Record<string, Readonly<Record<string, ChainToken>>>>;
  /** Secrets by name, and how each gets its value. */
  readonly secrets?: Readonly<Record<string, SecretDeclaration>>;
  /** Where its traces and logs go: a list, so one sink or several is the same line. Absent: the local Collector only. */
  readonly telemetry?: ReadonlyArray<Sink>;
  /** Only a revision with a green verdict in this environment may be promoted here. */
  readonly promotesFrom?: string;
  readonly deploy?: { readonly server?: Deployment; readonly mcp?: Deployment; readonly portal?: Deployment };
  readonly publish?: { readonly sdk?: Publication | ReadonlyArray<Publication>; readonly cli?: Publication | ReadonlyArray<Publication> };
}

/** The declaration. It has no name: the file's name is the environment's. */
export interface Environment extends EnvironmentSpec {
  readonly kind: "environment";
}

export interface EnvironmentsApi {
  readonly environment: (spec: EnvironmentSpec) => Environment;
}
