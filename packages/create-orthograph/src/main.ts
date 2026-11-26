#!/usr/bin/env node
// `npm create orthograph <name>`. The only file here that reads the process, prints or exits.
import { NodeRuntime } from "@effect/platform-node";
import { Console, Effect } from "effect";
import { Create } from "#modules/create/service.js";

NodeRuntime.runMain(
  Create.run({ args: process.argv.slice(2), parent: process.cwd() }).pipe(
    Effect.flatMap((lines) => Console.log(lines.join("\n"))),
    Effect.catchTag("AppRefused", (e) => Console.error(e.message).pipe(Effect.tap(() => Effect.sync(() => (process.exitCode = 2))))),
  ),
  { disableErrorReporting: true },
);
