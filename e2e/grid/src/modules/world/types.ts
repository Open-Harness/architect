// The project's real outputs, behind the ports the row evals' evidence is gathered through. Everything that touches the machine is a
// primitive handed in by `src/main.ts` (reading a file, listing a folder, running a command, loading a module), so this module is tested
// with plain functions; what it adds is how each output is asked for: the portal over the project's own blueprint, the CLI's `--help` as a
// process, the MCP server's `tools/list` as the server itself answers it, the spans a prove run wrote, prove's own report.
import type { OpenOptions } from "../../../../served-portal/types.ts";
import type { ProjectPorts } from "../project-evidence/types.ts";

export interface Primitives {
  /** A text file by absolute path; `undefined` when it is not there. */
  readonly read: (path: string) => string | undefined;
  /** Every file under a folder, as paths from it (`handle/claim.ts`); empty when there is none. */
  readonly list: (dir: string) => ReadonlyArray<string>;
  /** Run a command to its end in a folder. */
  readonly run: (command: string, args: ReadonlyArray<string>, cwd: string) => { readonly status: number | null; readonly stdout: string; readonly stderr: string };
  /** Delete a file or a folder with everything in it; nothing happens when it is not there. */
  readonly remove: (path: string) => void;
  /** Load a module by absolute path (`generated/mcp/src/index.ts`). */
  readonly load: (path: string) => Promise<Record<string, unknown>>;
}

/** What running prove for a fresh run came to. */
export interface ProveRun {
  /** Prove's own status, and what it printed. */
  readonly status: number | null;
  readonly output: string;
  /** Did it write its report this time? A prove that reports red journeys did; one that died before writing (a blueprint that does not compile) did not. */
  readonly fresh: boolean;
  /** Why the grid cannot judge, with prove's own status and the start of what it printed; empty when `fresh`. */
  readonly problems: ReadonlyArray<string>;
}

export interface WorldApi {
  /**
   * Run `ortho prove` so the report and spans the cells read are this run's: the previous ones are deleted first, so a prove that
   * fails before it writes leaves nothing behind to be judged. Red journeys are a fresh run (the cells judge them); no report is not.
   */
  readonly proveFresh: (options: { readonly repo: string; readonly project: string; readonly report: string; readonly telemetry: string; readonly node: Primitives }) => ProveRun;
  /** The real ports of the project at `project`; `report` is prove's `--report` JSON, `telemetry` its spans folder. */
  readonly ports: (options: {
    readonly project: string; readonly report: string; readonly telemetry: string; readonly node: Primitives;
    /** How the portal is served (K19), for a test that brings a stand-in client; the default is `@orthograph/portal`'s own. */
    readonly serve?: Omit<OpenOptions, "context">;
    /** Told why the portal could not be served or a page could not be read; `src/main.ts` prints it. */
    readonly onUnavailable?: (message: string) => void;
  }) => ProjectPorts;
}
