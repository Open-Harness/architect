// What the superagent includes of each service (design/goals/17-superagent.md, "A connection"): the calls and events the
// app's own mounts name. Each is written with the one naming rule, and `00-the-oracle` shows every one is in its spec.
import { join } from "node:path";
import { repo } from "../layer1/support.ts";
import type { Name } from "./pins.ts";

export interface Needs { readonly calls: ReadonlyArray<string>; readonly events: ReadonlyArray<string> }

export const NEEDS: Readonly<Record<Name, Needs>> = {
  github: {
    // issue and pull request comments (a pull request's conversation is its issue's), reviews, a pull request opened; the
    // push is a git push to the stand-in's bare repository, not a call
    calls: [
      "issues.createComment", "issues.listComments", "pulls.create", "pulls.get",
      "pulls.createReview", "pulls.listReviews", "pulls.createReviewComment", "pulls.listReviewComments",
    ],
    // `gh webhook forward --events=issue_comment,issues,pull_request,pull_request_review,pull_request_review_comment,check_run`
    events: ["issueComment", "issues", "pullRequest", "pullRequestReview", "pullRequestReviewComment", "checkRun"],
  },
  slack: {
    calls: ["chatPostMessage", "conversationsReplies"],
    // not in Slack's spec: written by hand in the adapter (slice 4)
    events: ["appMention", "message"],
  },
  posthog: {
    calls: ["errorTrackingIssuesList", "errorTrackingIssuesRetrieve", "errorTrackingIssuesPartialUpdate"],
    events: [],
  },
};

/** The plugins the superagent's app holds, one folder each (the brief's folder tree). */
export const appPlugin = (name: Name) => join(repo, "examples/superagent/plugins", name);
