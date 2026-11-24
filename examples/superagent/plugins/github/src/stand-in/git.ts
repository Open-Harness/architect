// Scaffolded from ortho new adapter. Yours from now on.
// The stand-in's repository: a real bare repository, `acme/widgets`, with branch `main` at one commit, served by git's own
// smart HTTP (`git http-backend`) so a clone and a push work as they do against GitHub. Everything is under the state folder.
import { execFileSync, spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import type { IncomingHttpHeaders } from "node:http";
import { dirname, join } from "node:path";

const env = (dir: string) => ({
  PATH: process.env["PATH"] ?? "", HOME: dir, GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_SYSTEM: "/dev/null", GIT_TERMINAL_PROMPT: "0",
  GIT_AUTHOR_NAME: "Ann", GIT_AUTHOR_EMAIL: "ann@example.test", GIT_COMMITTER_NAME: "Ann", GIT_COMMITTER_EMAIL: "ann@example.test",
  GIT_AUTHOR_DATE: "2026-11-20T09:00:00Z", GIT_COMMITTER_DATE: "2026-11-20T09:00:00Z",
});

export interface Repo {
  /** The commit a branch is at, or none. */
  readonly sha: (branch: string) => string | undefined;
  /** The files a branch changes against another commit: the diff a line comment may sit in. */
  readonly changed: (base: string, head: string) => ReadonlyArray<string>;
  /** Serves git's smart HTTP for a request under `/<owner>/<repo>.git/`; `answer` is called once with the CGI's reply. */
  readonly serve: (input: { readonly method: string; readonly path: string; readonly query: string; readonly headers: IncomingHttpHeaders; readonly body: Buffer; readonly user: string | undefined }, answer: (status: number, headers: Record<string, string>, body: Buffer) => void) => void;
}

/** Makes `<dir>/acme/widgets.git` with its one commit. */
export const makeRepo = (dir: string): Repo => {
  const root = join(dir, "repos");
  const path = join(root, "acme/widgets.git");
  mkdirSync(dirname(path), { recursive: true });
  const git = (args: ReadonlyArray<string>, input?: string) => execFileSync("git", [...args], { cwd: path, env: env(dir), input, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();
  execFileSync("git", ["init", "--bare", "-b", "main", path], { env: env(dir), stdio: "ignore" });
  git(["config", "http.receivepack", "true"]);
  const blob = git(["hash-object", "-w", "--stdin"], "# widgets\n");
  const tree = git(["mktree"], `100644 blob ${blob}\tREADME.md\n`);
  git(["update-ref", "refs/heads/main", git(["commit-tree", tree, "-m", "Initial commit"])]);

  return {
    sha: (branch) => {
      const found = git(["for-each-ref", "--format=%(objectname)", `refs/heads/${branch}`]);
      return found === "" ? undefined : found;
    },
    changed: (base, head) => git(["diff", "--name-only", base, head]).split("\n").filter((f) => f !== ""),
    serve: (input, answer) => {
      const cgi = spawn("git", ["http-backend"], {
        env: {
          ...env(dir), GIT_PROJECT_ROOT: root, GIT_HTTP_EXPORT_ALL: "1", GATEWAY_INTERFACE: "CGI/1.1", REMOTE_ADDR: "127.0.0.1",
          REQUEST_METHOD: input.method, PATH_INFO: input.path, QUERY_STRING: input.query, CONTENT_TYPE: String(input.headers["content-type"] ?? ""),
          CONTENT_LENGTH: String(input.body.length), HTTP_CONTENT_ENCODING: String(input.headers["content-encoding"] ?? ""),
          ...(input.user === undefined ? {} : { REMOTE_USER: input.user }),
        },
        stdio: ["pipe", "pipe", "ignore"],
      });
      const out: Array<Buffer> = [];
      cgi.stdout.on("data", (c: Buffer) => out.push(c));
      cgi.on("close", () => {
        const all = Buffer.concat(out);
        const split = all.indexOf("\r\n\r\n");
        const head = (split < 0 ? all : all.subarray(0, split)).toString("utf8").split(/\r?\n/);
        const headers = Object.fromEntries(head.filter((l) => l.includes(":")).map((l) => [l.slice(0, l.indexOf(":")).toLowerCase(), l.slice(l.indexOf(":") + 1).trim()]));
        const { status, ...rest } = headers;
        answer(status === undefined ? 200 : Number.parseInt(status, 10), rest, split < 0 ? Buffer.alloc(0) : all.subarray(split + 4));
      });
      cgi.stdin.on("error", () => undefined);
      cgi.stdin.end(input.body);
    },
  };
};
