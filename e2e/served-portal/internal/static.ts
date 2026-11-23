import { existsSync, readFileSync, statSync } from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { extname, join, normalize } from "node:path";

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png",
  ".woff2": "font/woff2", ".woff": "font/woff", ".ico": "image/x-icon", ".map": "application/json", ".txt": "text/plain",
};

/** Workers static assets with single-page fallback: `/portal` and any `/portal/<route>` with no extension is `index.html`; a file with an extension is that file, or a 404. */
const assetFor = (clientDir: string, pathname: string): { readonly file: string; readonly type: string } | undefined => {
  const rest = pathname === "/portal" ? "/" : pathname.slice("/portal".length);
  const relative = normalize(rest).replace(/^[/\\]+/, "");
  if (relative.startsWith("..")) return undefined;
  const file = join(clientDir, relative);
  if (relative !== "" && existsSync(file) && statSync(file).isFile()) return { file, type: TYPES[extname(file)] ?? "application/octet-stream" };
  // Not a file: a route (`operations/handle.claim` has an extension that is a name, not a type) is the shell; a missing asset is a 404.
  return extname(relative) in TYPES ? undefined : { file: join(clientDir, "index.html"), type: TYPES[".html"]! };
};

/** An HTTP server on a free loopback port: `/portal*` from the built client, `/_portal/v1/*` from `data`, the rest 404. */
export const listen = async (clientDir: string, data: (request: Request) => Promise<Response>): Promise<{ readonly url: string; readonly server: Server }> => {
  const server = createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    const done = (status: number, type: string, body: string | Uint8Array) => { res.writeHead(status, { "content-type": type, "cache-control": "no-store" }); res.end(body); };
    if (url.pathname === "/portal" || url.pathname.startsWith("/portal/")) {
      const asset = assetFor(clientDir, url.pathname);
      if (asset === undefined || !existsSync(asset.file)) return done(404, "text/plain", "not found");
      return done(200, asset.type, readFileSync(asset.file));
    }
    if (url.pathname.startsWith("/_portal/v1/")) {
      data(new Request(`http://127.0.0.1${req.url}`, { method: req.method ?? "GET" })).then(
        async (response) => done(response.status, response.headers.get("content-type") ?? "application/octet-stream", new Uint8Array(await response.arrayBuffer())),
        (error: unknown) => done(500, "text/plain", String(error)),
      );
      return;
    }
    done(404, "text/plain", "not found");
  });
  await new Promise<void>((resolve) => { server.listen(0, "127.0.0.1", resolve); });
  return { url: `http://127.0.0.1:${(server.address() as AddressInfo).port}`, server };
};
