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
      // the policy's `sync`: a repository's collaborators become the accounts a person may list (GOAL17-source-from, `policyPart`)
      "repos.listCollaborators",
    ],
    // `gh webhook forward --events=issue_comment,issues,pull_request,pull_request_review,pull_request_review_comment,check_run`
    events: ["issueComment", "issues", "pullRequest", "pullRequestReview", "pullRequestReviewComment", "checkRun"],
  },
  slack: {
    // `usergroupsUsersList` is the policy's `sync` for Slack: a user group becomes the accounts a person may list
    calls: ["chatPostMessage", "conversationsReplies", "usergroupsUsersList"],
    // not in Slack's spec: written by hand in the adapter (slice 4)
    events: ["appMention", "message"],
  },
  posthog: {
    calls: ["errorTrackingIssuesList", "errorTrackingIssuesRetrieve", "errorTrackingIssuesPartialUpdate"],
    // not in PostHog's spec: written by hand in the adapter (slice 11, GOAL17-names call 6), as Slack's are. PostHog publishes no
    // alert-webhook body (its destinations template one), so 65 judges them against the shape the README fixes (slice 10).
    events: ["errorAlert", "errorResolved"],
  },
};

/** The plugins the superagent's app holds, one folder each (the brief's folder tree). */
/** `SUPERAGENT_APP` points the checks at another app (an author's throwaway that should pass: README, point 6 of slice 5), never in CI. */
export const appPlugin = (name: Name) => join(process.env["SUPERAGENT_APP"] ?? join(repo, "examples/superagent"), "plugins", name);
