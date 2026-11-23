// The sandbox bridge's process: the stand-in of `@orthograph/sandbox` (K40 fix 4), and the only file here that reads the process,
// the clock or the environment, prints or exits.
//   node main.ts --port 0 --dir <state folder> [--limit 16]
// It serves `modules/bridge`'s routes on loopback, each behind a secret it makes at start, and prints two lines for its launcher, secret first:
//   stand-in secret <64 hex digits>
//   stand-in listening on http://127.0.0.1:<port>
// The launcher sends the secret as `x-bridge-secret`. It is never on disk, in an argument or in the environment: the stdout pipe is the only
// place it is. SIGTERM, SIGINT, SIGHUP or an uncaught failure closes every sandbox (daemons stopped, command groups killed, folders removed).
import { randomBytes } from "node:crypto";
import { createServer } from "node:http";
import { mkdirSync } from "node:fs";
import { localDaemon } from "@earendil-works/pi-env";
import { Effect } from "effect";
import { TimersLive } from "@orthograph/language-effect/device";
import { Bridge } from "./modules/bridge/service.ts";
import { nodeDisk } from "./modules/disk/service.ts";
import { Sandboxes } from "./modules/sandboxes/service.ts";

const flag = (name: string): string | undefined => {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 ? process.argv[at + 1] : undefined;
};

const dir = flag("dir");
if (dir === undefined) {
  process.stderr.write("usage: node main.ts --port 0 --dir <state folder> [--limit 16]\n");
  process.exit(2);
}
mkdirSync(dir, { recursive: true });

const sandboxes = await Effect.runPromise(
  Sandboxes.make({
    dir, limit: Number(flag("limit") ?? 16), daemon: localDaemon(), systemPath: process.env["PATH"] ?? "/usr/bin:/bin", disk: nodeDisk,
    ids: { id: () => `sbx_${randomBytes(6).toString("hex")}`, token: () => randomBytes(16).toString("hex") },
    now: () => Date.now(),
  }).pipe(Effect.provide(TimersLive)),
);

// Made here and never configured; the launcher's stdout pipe is the one place it is written.
const secret = randomBytes(32).toString("hex");
const bridge = Bridge.of(sandboxes, secret);

const server = createServer((req, res) => {
  const chunks: Array<Buffer> = [];
  req.on("data", (c: Buffer) => chunks.push(c));
  req.on("end", async () => {
    const text = Buffer.concat(chunks).toString("utf8");
    let body: unknown;
    try { body = text === "" ? undefined : JSON.parse(text); } catch { body = null; }
    const url = new URL(req.url ?? "/", "http://bridge");
    const given = req.headers["x-bridge-secret"];
    const reply = await Effect.runPromise(bridge.handle({ method: req.method ?? "GET", path: url.pathname, body, secret: typeof given === "string" ? given : undefined }));
    res.writeHead(reply.status, { "content-type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(reply.body));
  });
});

server.listen(Number(flag("port") ?? 0), "127.0.0.1", () => {
  const address = server.address();
  process.stdout.write(`stand-in secret ${secret}\n`);
  process.stdout.write(`stand-in listening on http://127.0.0.1:${typeof address === "object" && address !== null ? address.port : 0}\n`);
});

// However the bridge ends, short of SIGKILL, it closes every sandbox first. SIGKILL cannot be caught: the next bridge on this folder
// finishes the work (its sweep kills the groups each sandbox's `.pgids` names, then removes the folders).
let stopping = false;
const stop = async (code: number) => {
  if (stopping) return;
  stopping = true;
  server.closeAllConnections();
  await Effect.runPromise(sandboxes.sweep.pipe(Effect.provide(TimersLive)));
  server.close(() => process.exit(code));
};
for (const signal of ["SIGTERM", "SIGINT", "SIGHUP"] as const) process.on(signal, () => void stop(0));
process.on("uncaughtException", (error) => { process.stderr.write(`the sandbox bridge failed: ${error.name}\n`); void stop(1); });
process.on("unhandledRejection", () => { process.stderr.write("the sandbox bridge failed: an unhandled rejection\n"); void stop(1); });
