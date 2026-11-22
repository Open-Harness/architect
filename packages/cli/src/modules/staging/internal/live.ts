// The real world `up` and `destroy` act through: Cloudflare's REST API (the destroy sweep), the Alchemy CLI as a child process (the one place a process is started), one GET, the bundle's build. `main.ts` adds the way to wait.
import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { Effect } from "effect";
import { Build } from "@orthograph/prove";
import { StagingFailed, type Tools } from "../types.ts";
import { alchemyBin } from "./alchemy-bin.ts";
import { account } from "./cloudflare.ts";

export const live = (pause: Tools["pause"], env: Readonly<Record<string, string | undefined>>): Tools => ({
  account,
  // Alchemy's async work is inside its own process: this side only starts it and reads how it ended. The credentials are its environment alone; the rest of the process's environment is
  // the caller's, minus any Cloudflare variable it held.
  alchemy: ({ args, cwd, credentials, env: given }) =>
    Effect.try({
      try: () => {
        mkdirSync(cwd, { recursive: true });
        const done = spawnSync(process.execPath, [alchemyBin, ...args], {
          cwd,
          encoding: "utf8",
          maxBuffer: 64 * 1024 * 1024,
          env: { ...clean(env), ...given, CLOUDFLARE_API_TOKEN: credentials.token, CLOUDFLARE_ACCOUNT_ID: credentials.account, CI: "1", NO_COLOR: "1", ALCHEMY_TELEMETRY_DISABLED: "1" },
        });
        return { status: done.status ?? 1, output: `${done.stdout ?? ""}${done.stderr ?? ""}` };
      },
      catch: () => new StagingFailed({ message: "alchemy could not be started" }),
    }),
  probe: (url) => Effect.tryPromise({ try: (signal) => fetch(url, { signal: AbortSignal.any([signal, AbortSignal.timeout(10_000)]) }).then((res) => res.status), catch: () => 0 }).pipe(Effect.orElseSucceed(() => 0)),
  pause,
  secret: () => randomBytes(32).toString("hex"),
  build: (root) =>
    Build.build(root, clean(env)).pipe(
      Effect.map((b) => ({ main: b.main, revision: b.revision, sha256: b.sha256 })),
      Effect.mapError((e) => new StagingFailed({ message: e.message })),
    ),
});

/** The environment with no Cloudflare or Alchemy variable in it: a build never holds a credential. */
const clean = (env: Readonly<Record<string, string | undefined>>): Record<string, string> =>
  Object.fromEntries(Object.entries(env).filter((e): e is [string, string] => e[1] !== undefined && !/^(CLOUDFLARE_|CF_|WRANGLER_|ALCHEMY_|ORTHO_STAGING_|ORTHO_AUTH_)/.test(e[0])));
