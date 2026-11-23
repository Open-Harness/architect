import { Schema, Source } from "orthograph";
import github from "@orthograph/github";
import { AccountRef, observedRow } from "../../src/modules/source/types.ts";
import { mentions } from "../../src/modules/source/service.ts";

/** Where a reply to a GitHub trigger goes: the repository and the issue or pull request. */
interface Address { readonly repository: string; readonly number: number }
interface Repository { readonly full_name: string }
interface Comment { readonly body: string; readonly html_url: string }
interface IssueComment { readonly comment: Comment; readonly issue: { readonly number: number }; readonly repository: Repository }
interface Review { readonly review: { readonly body: string | null; readonly html_url: string }; readonly pull_request: { readonly number: number }; readonly repository: Repository }
interface ReviewComment { readonly comment: Comment; readonly pull_request: { readonly number: number }; readonly repository: Repository }
interface Issue { readonly issue: { readonly number: number; readonly title: string; readonly body: string | null; readonly html_url: string }; readonly repository: Repository }
interface Check { readonly check_run: { readonly name: string; readonly conclusion: string | null; readonly html_url: string; readonly pull_requests: ReadonlyArray<{ readonly number: number }> }; readonly repository: Repository }
interface Closed { readonly action: string; readonly pull_request: { readonly number: number } }

const Config = Schema.Struct({
  repo: Schema.String,
  me: AccountRef,
  events: Schema.Array(Schema.Literals(["issues", "comments", "reviews", "checks"])),
});

const owner = (a: Address): string => a.repository.split("/")[0] ?? "";
const name = (a: Address): string => a.repository.split("/")[1] ?? "";

/** The GitHub connection: which of its events are triggers, how each maps to one, and how a reply and a history are made. */
export const githubSource = Source.from<typeof github, typeof Config.Type, Address>(github, {
  config: Config,
  scope: (c, m) => ({ listened: m.channel.repository === c.repo, observed: true, row: c.repo }),
  on: {
    issueComment: (raw, { me }) => {
      const e = raw as IssueComment;
      return {
        kind: "comment", thread: `issue/${e.issue.number}`, text: e.comment.body, url: e.comment.html_url,
        ...(mentions(e.comment.body, me.login) ? { addressed: "mention" as const } : {}),
        channel: { repository: e.repository.full_name, number: e.issue.number },
      };
    },
    pullRequestReview: (raw) => {
      const e = raw as Review;
      return { kind: "review", thread: `issue/${e.pull_request.number}`, text: e.review.body ?? "", url: e.review.html_url, channel: { repository: e.repository.full_name, number: e.pull_request.number } };
    },
    pullRequestReviewComment: (raw) => {
      const e = raw as ReviewComment;
      return { kind: "review", thread: `issue/${e.pull_request.number}`, text: e.comment.body, url: e.comment.html_url, channel: { repository: e.repository.full_name, number: e.pull_request.number } };
    },
    issues: (raw, { me }) => {
      const e = raw as Issue;
      const text = `${e.issue.title}\n${e.issue.body ?? ""}`;
      return {
        kind: "issue", thread: `issue/${e.issue.number}`, text, url: e.issue.html_url,
        ...(mentions(text, me.login) ? { addressed: "mention" as const } : {}),
        channel: { repository: e.repository.full_name, number: e.issue.number },
      };
    },
    checkRun: (raw) => {
      const e = raw as Check;
      const number = e.check_run.pull_requests[0]?.number;
      return number === undefined ? undefined : {
        kind: "check", thread: `issue/${number}`, text: `${e.check_run.name}: ${e.check_run.conclusion ?? "running"}`, url: e.check_run.html_url,
        channel: { repository: e.repository.full_name, number },
      };
    },
  },
  closed: { pullRequest: (raw) => { const e = raw as Closed; return e.action === "closed" ? `issue/${e.pull_request.number}` : undefined; } },
  reply: {
    call: github.calls.issues.createComment,
    args: (m) => ({ owner: owner(m.address), repo: name(m.address), issue_number: m.address.number, body: `${m.text}\n<!-- orthograph:${m.key} -->` }),
    landed: (message, key) => message.text.includes(`<!-- orthograph:${key} -->`),
    gone: [],
  },
  history: {
    call: github.calls.issues.listComments,
    args: (a, cursor) => ({ owner: owner(a), repo: name(a), issue_number: a.number, ...(cursor ? { page: Number(cursor) } : {}) }),
    page: (answer) => ({ messages: (answer as ReadonlyArray<{ readonly id: number; readonly user: { readonly id: number } | null; readonly created_at: string; readonly body?: string }>).map((c) => ({ id: String(c.id), from: String(c.user?.id ?? ""), at: c.created_at, text: c.body ?? "" })) }),
  },
  policyPart: { schema: Schema.Struct({ bots: Schema.Array(AccountRef) }), rows: (c) => [{ id: c.repo, label: c.repo, cells: observedRow }] },
  environment: {
    variables: { GITHUB_REPOSITORY: "owner/name of the repository the ticket started on", GITHUB_NUMBER: "the issue or pull request number" },
    of: (m) => ({ GITHUB_REPOSITORY: m.channel.repository, GITHUB_NUMBER: String(m.channel.number) }),
  },
});
