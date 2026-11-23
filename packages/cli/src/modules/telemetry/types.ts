// `ortho telemetry trace <id>`: seeing what a call did (O1, D3 #100 to #104).
import type { Effect } from "effect";

/** What a command prints and how it exits; only `main.ts` writes it out. */
export interface Said {
  readonly out: string;
  readonly err: string;
  readonly exit: number;
}

export interface TelemetryCommandApi {
  /**
   * Print a trace as a tree with its logs, read from the files the Collector wrote (`TraceSource`): a refusal marked
   * `refused`, a defect marked `✘ defect`. `env` narrows the search to `local` (prove) or an environment's own folder.
   * It needs no viewer and works over SSH.
   */
  readonly trace: (options: { readonly root: string; readonly id: string; readonly env?: string }) => Effect.Effect<Said>;
}
