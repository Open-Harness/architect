// Check 60 (Goal 17 slice 10): the instruments checks 61 to 65 judge the connections by are themselves sound, so a red later is
// the connection's fault. The signing helpers agree with the schemes the services publish; every GitHub payload the checks send
// fits GitHub's spec and each planted wrong one does not. Nothing here touches the app.
import { describe, expect, it } from "vitest";
import {
  CHECK_ON_NO_PR, CHECK_ON_PR, COMMENT_CREATED, COMMENT_EDITED, ISSUE_OPENED, PR_CLOSED, REVIEW_COMMENT_CREATED, REVIEW_SUBMITTED,
  SLACK_DOCUMENTED, githubLegacySignature, githubSchemaOf, githubSignature, githubSpec, setAt, slackSignature, type Obj,
} from "./connections.ts";
import { problems } from "./schema.ts";

describe("60 signing: the helpers agree with what GitHub and Slack publish", () => {
  it("GitHub's own documented test vector: the secret and body in its docs give its documented signature", () => {
    expect(githubSignature("It's a Secret to Everybody", "Hello, World!")).toBe("sha256=757107ea0eb2509fc211221cce984b8a37570b6d7586c22c46f4379c8b043e17");
  });
  it("Slack's own worked example (docs.slack.dev, \"Verifying requests from Slack\"): its secret, time and body give its published signature", () => {
    expect(slackSignature(SLACK_DOCUMENTED.secret, SLACK_DOCUMENTED.timestamp, SLACK_DOCUMENTED.body)).toBe(SLACK_DOCUMENTED.signature);
  });
  it("Slack signs `v0:<timestamp>:<body>`: another timestamp, another body or another secret is another signature", () => {
    const { secret, timestamp, body } = SLACK_DOCUMENTED;
    const base = slackSignature(secret, timestamp, body);
    expect(new Set([base, slackSignature(secret, timestamp + 1, body), slackSignature(secret, timestamp, `${body}&x=1`), slackSignature("other", timestamp, body)]).size).toBe(4);
  });
  it("GitHub's legacy header is a different scheme: the same secret and body give a sha1 value, not the sha256 one, and never the other's length", () => {
    const sha1 = githubLegacySignature("It's a Secret to Everybody", "Hello, World!");
    expect(sha1).toMatch(/^sha1=[0-9a-f]{40}$/);
    expect(githubSignature("It's a Secret to Everybody", "Hello, World!")).toMatch(/^sha256=[0-9a-f]{64}$/);
  });
});

const ENTRIES: ReadonlyArray<readonly [string, string, Obj, ReadonlyArray<string>]> = [
  ["issue-comment-created", "a created comment", COMMENT_CREATED, ["comment.id", "comment.body", "issue.number", "repository.full_name", "sender.id", "action"]],
  ["issue-comment-edited", "an edited comment", COMMENT_EDITED, ["comment.id", "comment.updated_at", "sender.id", "action"]],
  ["pull-request-review-submitted", "a submitted review", REVIEW_SUBMITTED, ["review.id", "pull_request.number", "sender.id", "action"]],
  ["pull-request-review-comment-created", "a review comment", REVIEW_COMMENT_CREATED, ["comment.id", "pull_request.number", "sender.id", "action"]],
  ["issues-opened", "an opened issue", ISSUE_OPENED, ["issue.number", "issue.title", "repository.full_name", "sender.id", "action"]],
  ["pull-request-closed", "a closed pull request", PR_CLOSED, ["pull_request.number", "pull_request.updated_at", "action"]],
  ["check-run-completed", "a check on a pull request", CHECK_ON_PR, ["check_run.id", "check_run.name", "sender.id"]],
  ["check-run-completed", "a check on no pull request", CHECK_ON_NO_PR, ["check_run.id", "sender.id"]],
];

describe.each(ENTRIES)("60 github: %s (%s)", (entry, _what, payload, parts) => {
  const spec = githubSpec();
  it("fits GitHub's spec for that webhook", () => { expect(problems(spec, githubSchemaOf(entry), payload)).toEqual([]); });
  it.each(parts)("and is refused with %s left out", (path) => {
    expect(problems(spec, githubSchemaOf(entry), setAt(payload, path, undefined)), path).not.toEqual([]);
  });
  it("and is refused with its sender's id a string, where GitHub sends a number", () => {
    expect(problems(spec, githubSchemaOf(entry), setAt(payload, "sender.id", "583231"))).not.toEqual([]);
  });
});
