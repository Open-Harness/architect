// The sandbox bridge's process: the stand-in of `@orthograph/sandbox` (K40 fix 4), and the only file here that reads the process,
// the clock or the environment, prints or exits.
//   node main.ts --port 0 --dir <state folder> [--limit 16]
// It prints `stand-in listening on <url>` and serves `modules/bridge`'s routes on loopback. SIGTERM or SIGINT closes every sandbox
// (daemons stopped, folders removed) before it exits, so a stopped bridge leaves nothing of its own.
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
const bridge = Bridge.of(sandboxes);

const server = createServer((req, res) => {
  const chunks: Array<Buffer> = [];
  req.on("data", (c: Buffer) => chunks.push(c));
  req.on("end", async () => {
    const text = Buffer.concat(chunks).toString("utf8");
    let body: unknown;
    try { body = text === "" ? undefined : JSON.parse(text); } catch { body = null; }
    const url = new URL(req.url ?? "/", "http://bridge");
    const reply = body === null
      ? { status: 400, body: { ok: false, error: { name: "BadRequest", what: "the body is not JSON" } } }
      : await Effect.runPromise(bridge.handle({ method: req.method ?? "GET", path: url.pathname, body }));
    res.writeHead(reply.status, { "content-type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(reply.body));
  });
});

server.listen(Number(flag("port") ?? 0), "127.0.0.1", () => {
  const address = server.address();
  process.stdout.write(`stand-in listening on http://127.0.0.1:${typeof address === "object" && address !== null ? address.port : 0}\n`);
});

const stop = async (code: number) => {
  server.closeAllConnections();
  await Effect.runPromise(sandboxes.sweep.pipe(Effect.provide(TimersLive)));
  server.close(() => process.exit(code));
};
process.on("SIGTERM", () => void stop(0));
process.on("SIGINT", () => void stop(0));
