import { Names } from "orthograph/server";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { Effect } from "effect";
import { FileSource, TraceTrees } from "@orthograph/prove";
import type { Said, TelemetryCommandApi } from "./types.ts";

const ID = /^[0-9a-f]{32}$/;
const refused = (err: string, exit = 2): Said => ({ out: "", err: `${err.trimEnd()}\n`, exit });

/** The folders a Collector wrote traces to, for one environment or all: prove's, dev's, and each environment's own. */
const foldersOf = (root: string, env: string | undefined): ReadonlyArray<string> => {
  const own = join(root, Names.folder, "environments");
  const environments = existsSync(own) ? readdirSync(own).map((n) => ({ name: n, dir: join(own, n, "telemetry") })) : [];
  const all = [{ name: "local", dir: join(root, Names.folder, "prove-telemetry") }, { name: "local", dir: join(root, Names.folder, "dev-telemetry") }, ...environments];
  return all.filter((f) => (env === undefined || f.name === env) && existsSync(f.dir)).map((f) => f.dir);
};

const checked = (id: string) =>
  !ID.test(id) ? refused(`"${id}" isn't a trace id: it is 32 hexadecimal characters, in the x-trace-id header of every response`) : undefined;

export const TelemetryCommand: TelemetryCommandApi = {
  trace: ({ root, id, env }) =>
    Effect.gen(function* () {
      const bad = checked(id);
      if (bad) return bad;
      const dirs = foldersOf(root, env);
      const found = dirs.length === 0 ? undefined : yield* FileSource.open(dirs).find(id);
      return found === undefined
        ? refused(`no trace ${id} in ${dirs.length === 0 ? `any telemetry folder of this project${env ? ` for ${env}` : ""} (prove writes .ortho/prove-telemetry)` : dirs.map((d) => d.replace(`${root}/`, "")).join(", ")}`, 1)
        : { out: TraceTrees.render(id, found).join("\n") + "\n", err: "", exit: 0 } satisfies Said;
    }),
};
