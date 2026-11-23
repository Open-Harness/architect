// Scaffolded from ortho new adapter. Yours from now on.
// PostHog's world: project 1 with three error tracking issues, two active and one resolved. A request in, a reply out; no
// clock, no process, no network, so a test can drive it directly.
export interface Request {
  readonly method: string;
  readonly path: string;
  readonly query: URLSearchParams;
  readonly authorization: string | undefined;
  readonly body: string | undefined;
}
export interface Reply { readonly status: number; readonly body: unknown }
export interface Context {
  /** The address the server listens on, for the `next` and `previous` links of a page. */
  readonly origin: () => string;
  /** Told after every change, so the world's state can be kept in the state folder. */
  readonly saved: (state: unknown) => void;
}

interface Issue { id: string; status: string; severity: string | null; name: string | null; description: string | null; first_seen: string | null; assignee: null; cohort: null; external_issues: Array<never> }

const STATUSES = ["active", "resolved", "suppressed"];
const SEVERITIES = ["low", "medium", "high", "critical"];

const fail = (status: number, code: string, detail: string, attr: string | null = null, type = "invalid_request"): Reply => ({ status, body: { type, code, detail, attr } });
const notFound = fail(404, "not_found", "Not found.");
const unauthenticated = fail(401, "not_authenticated", "Authentication credentials were not provided.", null, "authentication_error");

const issue = (n: number, status: string, name: string): Issue => ({
  id: `0190f5d8-0000-7000-8000-00000000000${n}`, status, severity: null, name, description: null, first_seen: "2026-11-20T09:00:00Z", assignee: null, cohort: null, external_issues: [],
});

const ISSUES = "/api/projects/1/error_tracking/issues/";

export const createWorld = (context: Context) => {
  const issues: Array<Issue> = [issue(1, "active", "TypeError: slug is undefined"), issue(2, "active", "RangeError: invalid array length"), issue(3, "resolved", "NetworkError: failed to fetch")];

  const page = (query: URLSearchParams): Reply => {
    const limit = Math.max(1, Number(query.get("limit") ?? 100) || 100);
    const offset = Math.max(0, Number(query.get("offset") ?? 0) || 0);
    const link = (to: number) => `${context.origin()}${ISSUES}?limit=${limit}&offset=${to}`;
    return { status: 200, body: {
      count: issues.length,
      next: offset + limit < issues.length ? link(offset + limit) : null,
      previous: offset > 0 ? link(Math.max(0, offset - limit)) : null,
      results: issues.slice(offset, offset + limit),
    } };
  };

  const update = (found: Issue, text: string | undefined): Reply => {
    const parsed: unknown = text === undefined ? {} : JSON.parse(text);
    const body = typeof parsed === "object" && parsed !== null ? parsed as Record<string, unknown> : {};
    if ("status" in body && !STATUSES.includes(String(body["status"]))) return fail(400, "invalid_choice", `"${String(body["status"])}" is not a valid choice.`, "status", "validation_error");
    if ("severity" in body && body["severity"] !== null && !SEVERITIES.includes(String(body["severity"]))) return fail(400, "invalid_choice", `"${String(body["severity"])}" is not a valid choice.`, "severity", "validation_error");
    for (const key of ["status", "severity", "name", "description"] as const) if (key in body) Object.assign(found, { [key]: body[key] });
    context.saved({ issues });
    return { status: 200, body: found };
  };

  const handle = (request: Request): Reply => {
    const token = request.authorization?.replace(/^Bearer\s+/i, "") ?? "";
    if (token === "") return unauthenticated;
    const project = /^\/api\/projects\/([^/]+)\/error_tracking\/issues\/(?:([^/]+)\/)?$/.exec(request.path);
    if (project === null || project[1] !== "1") return notFound;
    const found = project[2] === undefined ? undefined : issues.find((i) => i.id === project[2]);
    if (project[2] === undefined) return request.method === "GET" ? page(request.query) : fail(405, "method_not_allowed", `Method "${request.method}" not allowed.`);
    if (found === undefined) return notFound;
    if (request.method === "GET") return { status: 200, body: found };
    if (request.method === "PATCH" || request.method === "PUT") return update(found, request.body);
    return fail(405, "method_not_allowed", `Method "${request.method}" not allowed.`);
  };

  return { handle };
};
