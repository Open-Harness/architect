import { Blueprint } from "orthograph";
import posthog from "@orthograph/posthog";

/** What this app uses of PostHog: error issues, read and updated. Its alert events come with slice 11. */
export default Blueprint.use(posthog, (p) => [
  p.include(p.calls.errorTrackingIssuesList),
  p.include(p.calls.errorTrackingIssuesRetrieve),
  p.include(p.calls.errorTrackingIssuesPartialUpdate),
]);
