import { Blueprint } from "orthograph";
import posthog from "@orthograph/posthog";

/** What this app uses of PostHog: error issues, read and updated, and the two alert events its template sends. */
export default Blueprint.use(posthog, (p) => [
  p.include(p.calls.errorTrackingIssuesList),
  p.include(p.calls.errorTrackingIssuesRetrieve),
  p.include(p.calls.errorTrackingIssuesPartialUpdate),
  p.include(p.events.errorAlert),
  p.include(p.events.errorResolved),
]);
