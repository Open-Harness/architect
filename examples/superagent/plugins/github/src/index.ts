// Generated from GitHub v3 REST API 1.1.4. Do not edit.
import { Blueprint } from "orthograph";
import { GithubApiFailure, GithubInputRefused, GithubAnswerRefused, GithubUnreachable } from "../blueprint/things/github/errors.ts";
import { schemaOf } from "./runtime/json-schema.ts";
import { components } from "./spec/components.ts";
import { eventPayloads } from "./spec/events.ts";
import { door, events as written, standIn } from "./written.ts";

export { GithubApiFailure, GithubInputRefused, GithubAnswerRefused, GithubUnreachable };

/** What every call may fail with: the client's four failures, as errors an operation can refuse with. */
const errors = [GithubApiFailure, GithubInputRefused, GithubAnswerRefused, GithubUnreachable];

/** The payload of an event: any one of the payloads its service documents for it. */
const payload = (event: string) => Blueprint.incoming(schemaOf(components, { oneOf: eventPayloads[event] ?? [] }));

export default Blueprint.adapter({
  description: "GitHub v3 REST API 1.1.4: every call and event its published description lists.",
  calls: {
    "issues": {
      "createComment": Blueprint.call({ errors }),
      "deleteComment": Blueprint.call({ errors }),
      "get": Blueprint.call({ errors }),
      "getComment": Blueprint.call({ errors }),
      "listComments": Blueprint.call({ errors }),
      "update": Blueprint.call({ errors }),
      "updateComment": Blueprint.call({ errors }),
    },
    "pulls": {
      "checkIfMerged": Blueprint.call({ errors }),
      "create": Blueprint.call({ errors }),
      "createReview": Blueprint.call({ errors }),
      "createReviewComment": Blueprint.call({ errors }),
      "get": Blueprint.call({ errors }),
      "list": Blueprint.call({ errors }),
      "listReviewComments": Blueprint.call({ errors }),
      "listReviews": Blueprint.call({ errors }),
      "merge": Blueprint.call({ errors }),
      "update": Blueprint.call({ errors }),
    },
    "repos": {
      "delete": Blueprint.call({ errors }),
      "get": Blueprint.call({ errors }),
      "listCollaborators": Blueprint.call({ errors }),
      "update": Blueprint.call({ errors }),
    },
  },
  events: {
    "checkRun": payload("checkRun"),
    "issueComment": payload("issueComment"),
    "issues": payload("issues"),
    "pullRequest": payload("pullRequest"),
    "pullRequestReview": payload("pullRequestReview"),
    "pullRequestReviewComment": payload("pullRequestReviewComment"),
    "push": payload("push"),
    "star": payload("star"),
    ...written,
  },
  standIn,
  ...(door === undefined ? {} : { door }),
});
