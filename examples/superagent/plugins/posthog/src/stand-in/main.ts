// Scaffolded from ortho new adapter. Yours from now on.
// PostHog's stand-in: a small server that speaks the part of PostHog's REST API the superagent uses, over three error
// tracking issues in project 1. `node main.ts --port 0 --dir <state folder>`; it prints `stand-in listening on <url>` and
// stops on SIGTERM. This file is the process's entry: the only one here that reads the process, prints or exits.
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

const origin = { current: "" };
const world = createWorld({ origin: () => origin.current, saved: (state) => writeFileSync(join(dir, "state.json"), JSON.stringify(state, null, 2)) });

const server = createServer((req, res) => {
  const chunks: Array<Buffer> = [];
  req.on("data", (c: Buffer) => chunks.push(c));
  req.on("end", () => {
    const url = new URL(req.url ?? "/", "http://stand-in");
    const text = Buffer.concat(chunks).toString("utf8");
    let reply: Reply;
    try {
      reply = world.handle({ method: req.method ?? "GET", path: url.pathname, query: url.searchParams, authorization: req.headers["authorization"], body: text === "" ? undefined : text });
    } catch {
      reply = { status: 400, body: { type: "validation_error", code: "parse_error", detail: "Malformed request.", attr: null } };
    }
    res.writeHead(reply.status, { "content-type": "application/json" });
    res.end(JSON.stringify(reply.body));
  });
});

server.listen(Number(flag("port") ?? 0), "127.0.0.1", () => {
  const address = server.address();
  const port = typeof address === "object" && address !== null ? address.port : 0;
  origin.current = `http://127.0.0.1:${port}`;
  process.stdout.write(`stand-in listening on ${origin.current}\n`);
});

process.on("SIGTERM", () => {
  server.closeAllConnections();
  server.close(() => process.exit(0));
});
