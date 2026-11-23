// Generated from PostHog API 1.0.0. Do not edit.
import { Blueprint } from "orthograph";
import { events as written, standIn } from "./written.ts";

export default Blueprint.adapter({
  description: "PostHog API 1.0.0: every call and event its published description lists.",
  calls: {
    "errorTrackingIssuesDestroy": Blueprint.call(),
    "errorTrackingIssuesExistsRetrieve": Blueprint.call(),
    "errorTrackingIssuesList": Blueprint.call(),
    "errorTrackingIssuesPartialUpdate": Blueprint.call(),
    "errorTrackingIssuesRetrieve": Blueprint.call(),
    "errorTrackingIssuesUpdate": Blueprint.call(),
  },
  events: {
    ...written,
  },
  standIn,
});
