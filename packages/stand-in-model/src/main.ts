// The model stand-in's process: `node main.ts --port 0 --dir <state folder>`. It prints `stand-in listening on <url>` and stops on SIGTERM.
// This file is the only one here that reads the process, prints, exits, or touches a socket; the rest is values and effects (`modules/`).
import { createServer } from "node:http";
import { Effect } from "effect";
import { Server } from "./modules/server/service.ts";
import { jsonOf } from "./modules/server/internal/incoming.ts";
import type { Sink } from "./modules/server/types.ts";

const flag = (name: string): string | undefined => {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 ? process.argv[at + 1] : undefined;
};

const stand = Effect.runSync(Server.make);

const server = createServer((req, res) => {
  const chunks: Array<Buffer> = [];
  req.on("data", (c: Buffer) => chunks.push(c));
  req.on("end", () => {
    const body = Buffer.concat(chunks).toString("utf8");
    const path = new URL(req.url ?? "/", "http://stand-in").pathname;
    const sink: Sink = {
      head: (status, headers) => { res.writeHead(status, headers); },
      write: (text) => { res.write(text); },
      end: (text) => { res.end(text); },
      destroy: () => { req.socket.destroy(); },
    };
    if (path.startsWith("/_stand/")) {
      const done = Effect.runPromise(stand.command(path.slice("/_stand/".length), jsonOf(body) ?? {}));
      void done.then((answer) => { sink.head(answer.status, { "content-type": "application/json" }); sink.end(JSON.stringify(answer.body)); });
      return;
    }
    const headers = Object.fromEntries(Object.entries(req.headers).map(([k, v]) => [k, Array.isArray(v) ? v.join(",") : v]));
    Effect.runFork(stand.chat({ method: req.method ?? "GET", path, headers, body }, sink));
  });
});

server.listen(Number(flag("port") ?? 0), "127.0.0.1", () => {
  const address = server.address();
  process.stdout.write(`stand-in listening on http://127.0.0.1:${typeof address === "object" && address !== null ? address.port : 0}\n`);
});

process.on("SIGTERM", () => {
  server.closeAllConnections();
  server.close(() => process.exit(0));
});
