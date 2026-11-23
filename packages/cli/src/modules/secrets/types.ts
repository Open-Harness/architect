// `ortho secrets [--env <name>]` and `ortho secrets set <NAME> [--env <name>]`: which declared secrets have a value, and
// setting one. Names and set/missing only: a value is read from stdin by `main.ts`, written to the environment's
// `secrets.env`, and never printed.
import type { Effect } from "effect";

/** What the command has to say. `main.ts` prints it and exits with `exit`; the module never prints. */
export interface Said {
  readonly out: string;
  readonly err: string;
  readonly exit: number;
}

export interface SecretsCommandApi {
  /** What to say when `args` (everything after `ortho`) put a secret's value on the command line, else nothing. Checked before parsing, so no parser error quotes it. */
  readonly refusesValue: (args: ReadonlyArray<string>) => string | undefined;
  /** One row per declared secret: `NAME  how  kind  status`, after a header. An unknown environment or an invalid blueprint is an answer: exit 2. */
  readonly list: (options: { readonly root: string; readonly env: string }) => Effect.Effect<Said>;
  /** Keeps `value` (the whole of stdin, less its one final newline) for `name` in `env`. Says `set NAME in <env>` and nothing of the value. */
  readonly set: (options: { readonly root: string; readonly env: string; readonly name: string; readonly stdin: string }) => Effect.Effect<Said>;
}
