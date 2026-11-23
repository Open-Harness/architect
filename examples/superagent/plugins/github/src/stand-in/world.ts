// Scaffolded from ortho new adapter. Yours from now on.
// GitHub's world: repository acme/widgets, branch `main`, issue 1 open. Issues and pull requests share one numbering, so the
// first pull request is 2. A request in, a reply out; the repository and the clock come from the caller.
import { made } from "./example.ts";
import type { Repo } from "./git.ts";

export interface Request { readonly method: string; readonly path: string; readonly query: URLSearchParams; readonly authorization: string | undefined; readonly body: string | undefined }
export interface Reply { readonly status: number; readonly body: unknown }
export interface Context {
  readonly origin: () => string;
  /** The time now, as an ISO 8601 string. */
  readonly now: () => string;
  readonly repo: Repo;
}

interface Comment { id: number; issue: number; body: string; at: string }
interface Pull { number: number; title: string; body: string | null; head: { ref: string; sha: string }; base: { ref: string; sha: string }; at: string }
interface Review { id: number; pull: number; state: string; body: string; at: string; commit: string }
interface Line { id: number; pull: number; body: string; path: string; line: number; side: string; commit: string; at: string }

const STATES: Readonly<Record<string, string>> = { COMMENT: "COMMENTED", REQUEST_CHANGES: "CHANGES_REQUESTED", APPROVE: "APPROVED" };
const DOCS = "https://docs.github.com/rest";

const fail = (status: number, message: string, errors?: ReadonlyArray<unknown>): Reply => ({ status, body: { message, documentation_url: DOCS, ...(errors === undefined ? {} : { errors }) } });
const invalid = (message: string, field: string, code = "invalid"): Reply => fail(422, "Validation Failed", [{ resource: message, field, code }]);
const objectOf = (text: string | undefined): Record<string, unknown> => {
  const parsed: unknown = text === undefined || text === "" ? {} : JSON.parse(text);
  return typeof parsed === "object" && parsed !== null ? parsed as Record<string, unknown> : {};
};
const text = (x: unknown): string | undefined => (typeof x === "string" && x !== "" ? x : undefined);

export const createWorld = (context: Context) => {
  const [comments, pulls, reviews, lines]: [Array<Comment>, Array<Pull>, Array<Review>, Array<Line>] = [[], [], [], []];
  const next = { id: 1000 };
  const base = () => `${context.origin()}/repos/acme/widgets`;
  const web = () => `${context.origin()}/acme/widgets`;
  const bot = () => made("simple-user", { login: "coder-bot", id: 7, type: "Bot", html_url: `${context.origin()}/coder-bot`, url: `${context.origin()}/users/coder-bot` });

  const comment = (c: Comment) => made("issue-comment", { id: c.id, body: c.body, user: bot(), created_at: c.at, updated_at: c.at, url: `${base()}/issues/comments/${c.id}`, html_url: `${web()}/issues/${c.issue}#issuecomment-${c.id}`, issue_url: `${base()}/issues/${c.issue}` });
  const side = (b: { ref: string; sha: string }) => ({ label: `acme:${b.ref}`, ref: b.ref, sha: b.sha, user: bot(), repo: made("repository", { id: 1, name: "widgets", full_name: "acme/widgets", private: false, html_url: web(), url: base() }) });
  const pull = (p: Pull) => made("pull-request", {
    number: p.number, id: 2000 + p.number, state: "open", locked: false, title: p.title, body: p.body, user: bot(), merged: false, merged_at: null, merged_by: null, closed_at: null,
    created_at: p.at, updated_at: p.at, url: `${base()}/pulls/${p.number}`, html_url: `${web()}/pull/${p.number}`, head: side(p.head), base: side(p.base), draft: false,
  });
  const review = (r: Review) => made("pull-request-review", { id: r.id, user: bot(), body: r.body, state: r.state, commit_id: r.commit, submitted_at: r.at, html_url: `${web()}/pull/${r.pull}#pullrequestreview-${r.id}`, pull_request_url: `${base()}/pulls/${r.pull}` });
  const line = (l: Line) => made("pull-request-review-comment", {
    id: l.id, body: l.body, path: l.path, line: l.line, side: l.side, commit_id: l.commit, original_commit_id: l.commit, user: bot(), created_at: l.at, updated_at: l.at,
    url: `${base()}/pulls/comments/${l.id}`, html_url: `${web()}/pull/${l.pull}#discussion_r${l.id}`, pull_request_url: `${base()}/pulls/${l.pull}`, pull_request_review_id: null,
  });

  const exists = (n: number) => n === 1 || pulls.some((p) => p.number === n);
  const paged = <A>(all: ReadonlyArray<A>, query: URLSearchParams): ReadonlyArray<A> => {
    const per = Math.min(100, Math.max(1, Number(query.get("per_page") ?? 30) || 30));
    const page = Math.max(1, Number(query.get("page") ?? 1) || 1);
    return all.slice((page - 1) * per, page * per);
  };

  const openPull = (given: Record<string, unknown>): Reply => {
    const [title, head, from] = [text(given["title"]), text(given["head"])?.replace(/^acme:/, ""), text(given["base"])];
    if (title === undefined) return invalid("PullRequest", "title", "missing_field");
    if (head === undefined || from === undefined) return invalid("PullRequest", head === undefined ? "head" : "base", "missing_field");
    const [headSha, baseSha] = [context.repo.sha(head), context.repo.sha(from)];
    if (headSha === undefined) return invalid("PullRequest", "head");
    if (baseSha === undefined) return invalid("PullRequest", "base");
    if (pulls.some((p) => p.head.ref === head)) return fail(422, "Validation Failed", [{ resource: "PullRequest", code: "custom", message: `A pull request already exists for acme:${head}.` }]);
    const made = { number: 2 + pulls.length, title, body: typeof given["body"] === "string" ? given["body"] : null, head: { ref: head, sha: headSha }, base: { ref: from, sha: baseSha }, at: context.now() };
    pulls.push(made);
    return { status: 201, body: pull(made) };
  };

  const submitReview = (p: Pull, given: Record<string, unknown>): Reply => {
    const event = text(given["event"]);
    if (event !== undefined && STATES[event] === undefined) return invalid("PullRequestReview", "event", "invalid");
    const made = { id: ++next.id, pull: p.number, state: event === undefined ? "PENDING" : STATES[event]!, body: typeof given["body"] === "string" ? given["body"] : "", at: context.now(), commit: p.head.sha };
    reviews.push(made);
    return { status: 200, body: review(made) };
  };

  const lineComment = (p: Pull, given: Record<string, unknown>): Reply => {
    const [body, path, commit] = [text(given["body"]), text(given["path"]), text(given["commit_id"])];
    if (body === undefined || path === undefined || commit === undefined || typeof given["line"] !== "number") return invalid("PullRequestReviewComment", body === undefined ? "body" : path === undefined ? "path" : "commit_id", "missing_field");
    if (!context.repo.changed(p.base.sha, p.head.sha).includes(path)) return invalid("PullRequestReviewComment", "path", "invalid");
    const made = { id: ++next.id, pull: p.number, body, path, line: given["line"], side: text(given["side"]) ?? "RIGHT", commit, at: context.now() };
    lines.push(made);
    return { status: 201, body: line(made) };
  };

  const handle = (request: Request): Reply => {
    const route = /^\/repos\/([^/]+)\/([^/]+)\/(issues|pulls)\/(\d+)\/(comments|reviews)$|^\/repos\/([^/]+)\/([^/]+)\/(pulls)$/.exec(request.path);
    if (route === null) return fail(404, "Not Found");
    const [owner, repo, kind, number, what] = route[8] === undefined ? [route[1], route[2], route[3], Number(route[4]), route[5]] : [route[6], route[7], "pulls", 0, undefined];
    if (owner !== "acme" || repo !== "widgets") return fail(404, "Not Found");
    const write = request.method === "POST";
    if (write && (request.authorization?.replace(/^Bearer\s+/i, "") ?? "") === "") return { status: 401, body: { message: "Requires authentication", documentation_url: DOCS, status: "401" } };
    const given = write ? objectOf(request.body) : {};
    if (what === undefined) return write ? openPull(given) : fail(404, "Not Found");
    const p = pulls.find((x) => x.number === number);
    if (kind === "issues") {
      if (!exists(number)) return fail(404, "Not Found");
      if (!write) return { status: 200, body: paged(comments.filter((c) => c.issue === number), request.query).map(comment) };
      if (text(given["body"]) === undefined) return invalid("IssueComment", "body", "missing_field");
      const made = { id: ++next.id, issue: number, body: String(given["body"]), at: context.now() };
      comments.push(made);
      return { status: 201, body: comment(made) };
    }
    if (p === undefined) return fail(404, "Not Found");
    if (what === "reviews") return write ? submitReview(p, given) : { status: 200, body: paged(reviews.filter((r) => r.pull === number), request.query).map(review) };
    return write ? lineComment(p, given) : { status: 200, body: paged(lines.filter((l) => l.pull === number), request.query).map(line) };
  };

  /** A pull request by number, for `GET /repos/acme/widgets/pulls/<n>`. */
  const read = (request: Request): Reply | undefined => {
    const found = /^\/repos\/acme\/widgets\/pulls\/(\d+)$/.exec(request.path);
    if (found === null || request.method !== "GET") return undefined;
    const p = pulls.find((x) => x.number === Number(found[1]));
    return p === undefined ? fail(404, "Not Found") : { status: 200, body: pull(p) };
  };

  return { handle: (request: Request): Reply => read(request) ?? handle(request) };
};
