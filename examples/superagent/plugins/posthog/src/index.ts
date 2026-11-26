// Generated from PostHog API 1.0.0. Do not edit.
import { Blueprint } from "orthograph";
import { PosthogApiFailure, PosthogInputRefused, PosthogAnswerRefused, PosthogUnreachable } from "../blueprint/things/posthog/errors.ts";
import { door, events as written, standIn } from "./written.ts";

export { PosthogApiFailure, PosthogInputRefused, PosthogAnswerRefused, PosthogUnreachable };

/** What every call may fail with: the client's four failures, as errors an operation can refuse with. */
const errors = [PosthogApiFailure, PosthogInputRefused, PosthogAnswerRefused, PosthogUnreachable];

export default Blueprint.adapter({
  description: "PostHog API 1.0.0: every call and event its published description lists.",
  calls: {
    "errorTrackingIssuesDestroy": Blueprint.call({ errors }),
    "errorTrackingIssuesExistsRetrieve": Blueprint.call({ errors }),
    "errorTrackingIssuesList": Blueprint.call({ errors }),
    "errorTrackingIssuesPartialUpdate": Blueprint.call({ errors }),
    "errorTrackingIssuesRetrieve": Blueprint.call({ errors }),
    "errorTrackingIssuesUpdate": Blueprint.call({ errors }),
  },
  events: {
    ...written,
  },
  standIn,
  ...(door === undefined ? {} : { door }),
});
