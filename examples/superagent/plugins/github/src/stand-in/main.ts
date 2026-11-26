// Scaffolded from ortho new adapter. Yours from now on.
// GitHub's stand-in: a real bare repository, acme/widgets, served by git's smart HTTP at `<base>/acme/widgets.git` (a clone
// and a push with `Authorization: Bearer ...` work), and GitHub's REST API for its issues and pull requests beside it.
// `node main.ts --port 0 --dir <state folder>`; it prints `stand-in listening on <url>` and stops on SIGTERM. This file is
// the process's entry: the only one here that reads the process, the clock, prints or exits.
import { mkdirSync } from "node:fs";
import { createServer } from "node:http";
import { makeRepo } from "./git.ts";
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
const repo = makeRepo(dir);
const world = createWorld({ origin: () => origin.current, now: () => new Date().toISOString(), repo });
const bearer = (header: string | undefined) => (header?.replace(/^Bearer\s+/i, "") ?? "") !== "";

const server = createServer((req, res) => {
  const chunks: Array<Buffer> = [];
  req.on("data", (c: Buffer) => chunks.push(c));
  req.on("end", () => {
    const url = new URL(req.url ?? "/", "http://stand-in");
    const body = Buffer.concat(chunks);
    const authed = bearer(req.headers["authorization"]);
    if (url.pathname.startsWith("/acme/widgets.git/")) {
      const pushing = url.searchParams.get("service") === "git-receive-pack" || url.pathname.endsWith("/git-receive-pack");
      if (pushing && !authed) {
        res.writeHead(401, { "content-type": "application/json" });
        res.end(JSON.stringify({ message: "Requires authentication" }));
        return;
      }
      repo.serve({ method: req.method ?? "GET", path: url.pathname, query: url.search.slice(1), headers: req.headers, body, user: authed ? "bot" : undefined }, (status, headers, out) => {
        res.writeHead(status, headers);
        res.end(out);
      });
      return;
    }
    let reply: Reply;
    try {
      reply = world.handle({ method: req.method ?? "GET", path: url.pathname, query: url.searchParams, authorization: req.headers["authorization"], body: body.length === 0 ? undefined : body.toString("utf8") });
    } catch {
      reply = { status: 400, body: { message: "Problems parsing JSON" } };
    }
    res.writeHead(reply.status, { "content-type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(reply.body));
  });
});

server.listen(Number(flag("port") ?? 0), "127.0.0.1", () => {
  const address = server.address();
  origin.current = `http://127.0.0.1:${typeof address === "object" && address !== null ? address.port : 0}`;
  process.stdout.write(`stand-in listening on ${origin.current}\n`);
});

process.on("SIGTERM", () => {
  server.closeAllConnections();
  server.close(() => process.exit(0));
});
