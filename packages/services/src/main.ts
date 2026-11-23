// The process entry: `node main.ts issuer --port <n> --config <file>` runs the OIDC issuer until it is stopped. The only file here
// that reads the command line, the filesystem for its config or `process`.
import { readFileSync } from "node:fs";
import { Cause, Effect } from "effect";
import { serve } from "#modules/issuer/service.js";
import type { IssuerConfig } from "#modules/issuer/types.js";

const [command, ...args] = process.argv.slice(2);
const flag = (name: string) => args[args.indexOf(`--${name}`) + 1];

if (command !== "issuer") {
  process.stderr.write("usage: main.ts issuer --port <n> --config <file>\n");
  process.exit(2);
}

const port = Number(flag("port"));
const file = flag("config");
const config: IssuerConfig = file === undefined ? {} : JSON.parse(readFileSync(file, "utf8"));

// A failure or a defect (the port was taken before it listened) is written to the log the owner reads, and the exit says it failed.
const said = (cause: Cause.Cause<unknown>) => {
  const error = Cause.squash(cause);
  return error instanceof Error ? error.message : Cause.pretty(cause);
};
Effect.runFork(Effect.scoped(serve(config, port).pipe(Effect.andThen(Effect.never))).pipe(
  Effect.catchCause((cause) => Effect.sync(() => {
    process.stderr.write(`issuer: ${said(cause)}\n`);
    process.exit(1);
  })),
));
