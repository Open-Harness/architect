import { Blueprint } from "orthograph";
import github from "@orthograph/github";

/** What this app uses of GitHub: comments and reviews in, pull requests out, and the events its door accepts. */
export default Blueprint.use(github, (g) => [
  g.include(g.calls.issues.createComment),
  g.include(g.calls.issues.listComments),
  g.include(g.calls.pulls.create),
  g.include(g.calls.pulls.get),
  g.include(g.calls.pulls.createReview),
  g.include(g.calls.pulls.listReviews),
  g.include(g.calls.pulls.createReviewComment),
  g.include(g.calls.pulls.listReviewComments),
  g.include(g.calls.repos.listCollaborators),
  g.include(g.events.issueComment),
  g.include(g.events.issues),
  g.include(g.events.pullRequest),
  g.include(g.events.pullRequestReview),
  g.include(g.events.pullRequestReviewComment),
  g.include(g.events.checkRun),
]);
