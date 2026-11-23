// Scaffolded from ortho new adapter. Yours from now on.
// What GitHub's description doesn't say. Its events are all in the description (webhooks), but not what makes one a single change
// and who sent it, so each event the superagent listens to is said again here with an `id` and an `actor` (GOAL17-connections A):
// the object's kind, the repository, the object's own id and its own last-change time, with no action and no delivery in it, so a
// poll's copy of the object (no `action`, no `sender`) gives the id its webhook gave. The stand-in is a real bare git repository,
// served over git's smart HTTP, with GitHub's REST API for issues and pull requests beside it.
import { Blueprint, Stand, type AdapterDoor, type AdapterEvent } from "orthograph";
import { schemaOf } from "./runtime/json-schema.ts";
import { components } from "./spec/components.ts";
import { eventPayloads } from "./spec/events.ts";

type Payload = Readonly<Record<string, any>>;
type Sender = { readonly id: number; readonly login: string; readonly type?: string };

/** The account that sent a delivery: the stable numeric id as text, the login for people, and whether it is a bot. */
const sender = (p: Payload) => {
  const s = p["sender"] as Sender | undefined | null;
  return s === undefined || s === null ? undefined : { id: String(s.id), name: s.login, bot: s.type === "Bot" };
};

/** An event of the description, named by its object and that object's own version (`at` is where its last-change time is). */
const named = (event: string, object: (p: Payload) => string | number, at: (p: Payload) => string | null | undefined) =>
  Blueprint.incoming(schemaOf(components, { oneOf: eventPayloads[event] ?? [] }), {
    id: (raw: unknown) => { const p = raw as Payload; return `${event}:${p["repository"]["full_name"]}:${object(p)}:${at(p) ?? ""}`; },
    actor: (raw: unknown) => sender(raw as Payload),
  });

/** Optional, so the generated descriptor may list the same names first and have these replace them (a spread of required keys over them is a type error). */
export const events: Partial<Record<"issueComment" | "issues" | "pullRequest" | "pullRequestReview" | "pullRequestReviewComment" | "checkRun", AdapterEvent<unknown>>> = {
  issueComment: named("issueComment", (p) => p["comment"]["id"], (p) => p["comment"]["updated_at"]),
  issues: named("issues", (p) => p["issue"]["number"], (p) => p["issue"]["updated_at"]),
  pullRequest: named("pullRequest", (p) => p["pull_request"]["number"], (p) => p["pull_request"]["updated_at"]),
  pullRequestReview: named("pullRequestReview", (p) => p["review"]["id"], (p) => p["review"]["submitted_at"]),
  pullRequestReviewComment: named("pullRequestReviewComment", (p) => p["comment"]["id"], (p) => p["comment"]["updated_at"]),
  checkRun: named("checkRun", (p) => p["check_run"]["id"], (p) => p["check_run"]["completed_at"] ?? p["check_run"]["started_at"]),
};

export const standIn = Stand.process("a bare git repository served by git http-backend, with a small server for GitHub's REST API over it");

/** GitHub's signing secret (its webhook's `secret`): in an environment it is `<MOUNT>_WEBHOOK_SIGNING`, `GITHUB_WEBHOOK_SIGNING` for the mount `github`. */
export const webhookSigning = Blueprint.secret.stored();

/** GitHub signs the raw body with HMAC-SHA256 (`X-Hub-Signature-256: sha256=<hex>`) and names the event in `X-GitHub-Event`; the delivery's own id (`X-GitHub-Delivery`) is never used (GOAL17-connections A). */
export const door: AdapterDoor = {
  signing: webhookSigning,
  verify: { header: "x-hub-signature-256", prefix: "sha256=", signs: "body" },
  event: { header: "x-github-event" },
  envelope: ["installation", "organization", "enterprise"],
};
