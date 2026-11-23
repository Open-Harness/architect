// Scaffolded from ortho new adapter. Yours from now on.
// Slack's stand-in: a small server that speaks the part of Slack's Web API the superagent uses, over channel C024BE91L.
// `node main.ts --port 0 --dir <state folder>`; it prints `stand-in listening on <url>` and stops on SIGTERM. This file is
// the process's entry: the only one here that reads the process, the clock, prints or exits.
import { mkdirSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { join } from "node:path";
import { createWorld, type Reply } from "./world.ts";

const flag = (name: string): string | undefined => {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 ? process.argv[at + 1] : undefined;
};

const dir = flag("dir");
if (dir === undefined) {
  process.stderr.write("usage: node main.ts --port 0 --dir <state folder>\n");
  process.exit(2);
}
mkdirSync(dir, { recursive: true });

const world = createWorld({ now: () => Date.now(), saved: (state) => writeFileSync(join(dir, "state.json"), JSON.stringify(state, null, 2)) });

const server = createServer((req, res) => {
  const chunks: Array<Buffer> = [];
  req.on("data", (c: Buffer) => chunks.push(c));
  req.on("end", () => {
    const url = new URL(req.url ?? "/", "http://stand-in");
    const text = Buffer.concat(chunks).toString("utf8");
    let reply: Reply;
    try {
      reply = world.handle({ method: req.method ?? "GET", path: url.pathname, query: url.searchParams, authorization: req.headers["authorization"], contentType: req.headers["content-type"], body: text === "" ? undefined : text });
    } catch {
      reply = { status: 200, body: { ok: false, error: "invalid_json" } };
    }
    res.writeHead(reply.status, { "content-type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(reply.body));
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
