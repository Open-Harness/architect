// A real HTTP server on this machine that stands in for the three GitHub addresses a release talks to: the API (`GITHUB_API_URL`: look up and create a release), the upload address the created release names (`upload_url`),
// and the download address a formula points at (`GITHUB_SERVER_URL/<owner>/<repo>/releases/download/<tag>/<file>`, which Homebrew fetches). It writes down every request and keeps the bytes uploaded.
// It shapes its answers as GitHub documents them (REST "Create a release", "Upload a release asset"); NOT JUDGED HERE: GitHub's own answers (the first real release is the proof). Written by the checks author.
import { type IncomingMessage, type Server, type ServerResponse, createServer } from "node:http";

export interface Heard { readonly method: string; readonly path: string; readonly query: URLSearchParams; readonly authorization: string | undefined; readonly body: Buffer }
export interface Standin {
  readonly base: string;
  readonly heard: Heard[];
  /** What was uploaded, by file name. Changing an entry changes what a later download gets. */
  readonly assets: Map<string, Buffer>;
  /** Releases created, by tag. */
  readonly releases: Map<string, Record<string, unknown>>;
  readonly close: () => Promise<void>;
}

export const startStandin = async (port: number, repository: string): Promise<Standin> => {
  const base = `http://127.0.0.1:${port}`;
  const heard: Heard[] = [];
  const assets = new Map<string, Buffer>();
  const releases = new Map<string, Record<string, unknown>>();
  const json = (res: ServerResponse, status: number, body: unknown) => res.writeHead(status, { "content-type": "application/json" }).end(JSON.stringify(body));
  const server: Server = createServer((req: IncomingMessage, res: ServerResponse) => {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c)).on("end", () => {
      const url = new URL(req.url ?? "/", base);
      heard.push({ method: req.method ?? "GET", path: url.pathname, query: url.searchParams, authorization: req.headers.authorization, body: Buffer.concat(chunks) });
      const path = url.pathname;
      const download = `/${repository}/releases/download/`;
      if (req.method === "GET" && path.startsWith(download)) {
        const found = assets.get(decodeURIComponent(path.split("/").at(-1) ?? ""));
        return found === undefined ? res.writeHead(404).end() : res.writeHead(200, { "content-type": "application/gzip", "content-length": found.length }).end(found);
      }
      if (req.headers.authorization === undefined) return json(res, 401, { message: "Requires authentication" });
      const tagged = new RegExp(`^/repos/${repository}/releases/tags/(.+)$`).exec(path);
      if (req.method === "GET" && tagged) return releases.has(tagged[1]!) ? json(res, 200, releases.get(tagged[1]!)) : json(res, 404, { message: "Not Found" });
      if (req.method === "POST" && path === `/repos/${repository}/releases`) {
        const made = JSON.parse(Buffer.concat(chunks).toString("utf8")) as { tag_name: string };
        if (releases.has(made.tag_name)) return json(res, 422, { message: "Validation Failed", errors: [{ resource: "Release", code: "already_exists", field: "tag_name" }] });
        const release = { id: 7, tag_name: made.tag_name, upload_url: `${base}/uploads/repos/${repository}/releases/7/assets{?name,label}`, html_url: `${base}/${repository}/releases/tag/${made.tag_name}` };
        releases.set(made.tag_name, release);
        return json(res, 201, release);
      }
      if (req.method === "POST" && path === `/uploads/repos/${repository}/releases/7/assets`) {
        const name = url.searchParams.get("name") ?? "";
        if (assets.has(name)) return json(res, 422, { message: "Validation Failed", errors: [{ code: "already_exists" }] });
        assets.set(name, Buffer.concat(chunks));
        return json(res, 201, { id: assets.size, name, browser_download_url: `${base}${download}${[...releases.keys()].at(-1)}/${name}` });
      }
      return json(res, 404, { message: "Not Found" });
    });
  });
  await new Promise<void>((ok) => server.listen(port, "127.0.0.1", ok));
  return { base, heard, assets, releases, close: () => new Promise<void>((ok) => { server.closeAllConnections(); server.close(() => ok()); }) };
};
