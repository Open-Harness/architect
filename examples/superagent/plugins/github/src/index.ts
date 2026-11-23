// Generated from GitHub v3 REST API 1.1.4. Do not edit.
import { Blueprint } from "orthograph";
import { schemaOf } from "./runtime/json-schema.ts";
import { components } from "./spec/components.ts";
import { eventPayloads } from "./spec/events.ts";
import { events as written, standIn } from "./written.ts";

/** The payload of an event: any one of the payloads its service documents for it. */
const payload = (event: string) => Blueprint.incoming(schemaOf(components, { oneOf: eventPayloads[event] ?? [] }));

export default Blueprint.adapter({
  description: "GitHub v3 REST API 1.1.4: every call and event its published description lists.",
  calls: {
    "issues": {
      "createComment": Blueprint.call(),
      "deleteComment": Blueprint.call(),
      "get": Blueprint.call(),
      "getComment": Blueprint.call(),
      "listComments": Blueprint.call(),
      "update": Blueprint.call(),
      "updateComment": Blueprint.call(),
    },
    "pulls": {
      "checkIfMerged": Blueprint.call(),
      "create": Blueprint.call(),
      "createReview": Blueprint.call(),
      "createReviewComment": Blueprint.call(),
      "get": Blueprint.call(),
      "list": Blueprint.call(),
      "listReviewComments": Blueprint.call(),
      "listReviews": Blueprint.call(),
      "merge": Blueprint.call(),
      "update": Blueprint.call(),
    },
    "repos": {
      "delete": Blueprint.call(),
      "get": Blueprint.call(),
      "listCollaborators": Blueprint.call(),
      "update": Blueprint.call(),
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
});
