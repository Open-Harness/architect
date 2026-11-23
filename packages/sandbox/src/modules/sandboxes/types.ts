import { Data, type Effect } from "effect";
import type { Timers } from "@orthograph/language-effect";
import type { Disk, DiskFailed } from "../disk/types.ts";
import type { BadVariableName, CredentialLikeVariable, EnvVar, Given } from "../environment/types.ts";
import type { BlockedCommand, InvalidBlocked } from "../commands/types.ts";
import type { OutsideSandbox } from "../fence/types.ts";
import type { BadLoanName, Lent, Loan, LoanExpired } from "../loans/types.ts";
import type { DaemonFailed } from "../relay/types.ts";

/** The id was closed, swept, or never opened. */
export class SandboxGone extends Data.TaggedError("SandboxGone")<{ readonly sandbox: string }> {}

/** The bridge holds its limit of open sandboxes. */
export class SandboxLimit extends Data.TaggedError("SandboxLimit")<{ readonly open: number }> {}

export interface OpenInput {
  /** The superagent: `SUPERAGENT_NAME`. */
  readonly owner: string;
  /** The ticket: `SUPERAGENT_TICKET`. A retry of `open` with the same owner and tag finds the same sandbox. */
  readonly tag: string;
  readonly variables: ReadonlyArray<Given>;
  readonly blocked: ReadonlyArray<string>;
}
export interface Opened { readonly sandbox: string; readonly address: string; readonly root: string }
export interface Closed { readonly closed: boolean; readonly killed: number }

export interface ExecInput {
  readonly sandbox: string;
  readonly command: ReadonlyArray<string>;
  readonly cwd?: string;
  /** Short-lived credentials for this one call (K40 fix 6). */
  readonly lend?: ReadonlyArray<Lent>;
  /** Default 120. */
  readonly timeoutSeconds?: number;
}
export interface Executed { readonly exit: number; readonly stdout: string; readonly stderr: string }
export interface WriteInput { readonly sandbox: string; readonly path: string; readonly content: string }
export interface ReadInput { readonly sandbox: string; readonly path: string }
export interface Listed { readonly sandbox: string; readonly owner: string; readonly tag: string; readonly state: SandboxState; readonly root: string }

export type SandboxState = "open" | "closed";

/** What a check reads of one sandbox. A credential is never in `env`; `lent` holds names only. */
export interface SeenSandbox {
  readonly sandbox: string;
  readonly owner: string;
  readonly tag: string;
  readonly root: string;
  readonly state: SandboxState;
  readonly env: ReadonlyArray<EnvVar>;
  readonly execs: ReadonlyArray<{ readonly command: ReadonlyArray<string>; readonly exit: number | null; readonly lent: ReadonlyArray<string> }>;
  readonly refusals: ReadonlyArray<{ readonly name: "OutsideSandbox" | "BlockedCommand"; readonly detail: string }>;
  readonly loans: ReadonlyArray<Loan>;
}

export interface Left {
  readonly folders: ReadonlyArray<string>;
  readonly processes: ReadonlyArray<{ readonly pid: number; readonly sandbox: string; readonly command: string }>;
}

export type OpenError = SandboxLimit | CredentialLikeVariable | BadVariableName | InvalidBlocked | DaemonFailed | DiskFailed;
export type ExecError = SandboxGone | OutsideSandbox | BlockedCommand | LoanExpired | BadLoanName;
export type FileError = SandboxGone | OutsideSandbox | DiskFailed;

export interface SandboxesConfig {
  /** The bridge's state folder: sandboxes are `<dir>/sandboxes/<id>`, and nothing else is in that folder. */
  readonly dir: string;
  readonly limit: number;
  /** pi-env's daemon, from `localDaemon()`. */
  readonly daemon: string;
  /** The `PATH` after the shims: what a sandbox's programs are found on. */
  readonly systemPath: string;
  readonly disk: Disk;
  /** A fresh id and a fresh token: random in a process, counted in a test. */
  readonly ids: { readonly id: () => string; readonly token: () => string };
  /** Epoch milliseconds, from the world's clock. */
  readonly now: () => number;
}

export interface SandboxesApi {
  readonly open: (input: OpenInput) => Effect.Effect<Opened, OpenError>;
  readonly close: (sandbox: string) => Effect.Effect<Closed>;
  readonly exec: (input: ExecInput) => Effect.Effect<Executed, ExecError>;
  readonly write: (input: WriteInput) => Effect.Effect<{ readonly bytes: number }, FileError>;
  readonly read: (input: ReadInput) => Effect.Effect<{ readonly content: string }, FileError>;
  readonly list: (input: { readonly tag?: string }) => Effect.Effect<ReadonlyArray<Listed>>;
  readonly seen: (input: { readonly sandbox?: string }) => Effect.Effect<ReadonlyArray<SeenSandbox>>;
  readonly left: Effect.Effect<Left>;
  /** Close every open sandbox, and remove any folder this bridge does not own (a crashed bridge's). */
  readonly sweep: Effect.Effect<void>;
}

export interface SandboxesFactory {
  readonly make: (config: SandboxesConfig) => Effect.Effect<SandboxesApi, never, Timers>;
}
