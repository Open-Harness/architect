import type { Scope } from "effect";
import type { Disk } from "../../disk/types.ts";
import type { EnvVar } from "../../environment/types.ts";
import type { Fence } from "../../fence/types.ts";
import type { Loan } from "../../loans/types.ts";
import type { Relay } from "../../relay/types.ts";
import type { SandboxesConfig, SandboxState } from "../types.ts";

/** One sandbox as the bridge holds it. Mutable on purpose: it is the bridge's record of a thing that changes, and nothing else writes it. */
export interface Live {
  readonly id: string;
  readonly owner: string;
  readonly tag: string;
  readonly root: string;
  readonly shims: string;
  readonly env: ReadonlyArray<EnvVar>;
  readonly blocked: ReadonlyArray<string>;
  readonly fence: Fence;
  readonly scope: Scope.Closeable;
  readonly relay: Relay;
  readonly processEnv: Readonly<Record<string, string>>;
  readonly execs: Array<{ command: ReadonlyArray<string>; exit: number | null; lent: ReadonlyArray<string> }>;
  readonly refusals: Array<{ name: "OutsideSandbox" | "BlockedCommand"; detail: string }>;
  readonly loans: Array<Loan>;
  /** Pids of the bridge's own `exec` processes that are still running. */
  readonly running: Set<number>;
  /** How many lines of the shims' log have become refusals. */
  hitsRead: number;
  state: SandboxState;
}

/** The pieces every internal step shares. */
export interface Shared {
  readonly config: SandboxesConfig;
  readonly disk: Disk;
  readonly all: Map<string, Live>;
}

export const rootOf = (config: SandboxesConfig, id: string): string => `${config.dir}/sandboxes/${id}`;
export const shimsOf = (config: SandboxesConfig, id: string): string => `${config.dir}/shims/${id}`;

/** The bridge-owned file listing the process groups of a sandbox's running `exec` calls, so a bridge killed hard cannot lose them. */
export const pgidsFile = (shims: string): string => `${shims}/.pgids`;
