// Mounting a plugin: `ortho add feature|adapter|projection <package>` writes one mount file, pins the installed version
// exactly (R1's three days for a registry release), and says what the plugin needs (M1-plugins section 11).
import { Data, type Effect } from "effect";

export type Kind = "feature" | "adapter" | "projection";

export interface AddPlugin {
  readonly root: string;
  readonly kind: Kind;
  readonly pkg: string;
  /** The mount's name, when it isn't the plugin's own. */
  readonly as?: string;
  readonly dryRun: boolean;
  /** Where registry releases are read: `npm_config_registry`, or npm's. */
  readonly registry: string;
}

/** What was written, or would be: its lines, in order. */
export interface Added {
  readonly lines: ReadonlyArray<string>;
}

/** Refused before anything is written, saying why and what to run instead. */
export class MountRefused extends Data.TaggedError("MountRefused")<{ readonly message: string }> {}

export interface MountingApi {
  readonly add: (request: AddPlugin) => Effect.Effect<Added, MountRefused>;
}
