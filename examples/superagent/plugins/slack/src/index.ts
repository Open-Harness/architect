// Generated from Slack Web API 1.7.0. Do not edit.
import { Blueprint } from "orthograph";
import { SlackApiFailure, SlackInputRefused, SlackAnswerRefused, SlackUnreachable } from "../blueprint/things/slack/errors.ts";
import { door, events as written, standIn } from "./written.ts";

export { SlackApiFailure, SlackInputRefused, SlackAnswerRefused, SlackUnreachable };

/** What every call may fail with: the client's four failures, as errors an operation can refuse with. */
const errors = [SlackApiFailure, SlackInputRefused, SlackAnswerRefused, SlackUnreachable];

export default Blueprint.adapter({
  description: "Slack Web API 1.7.0: every call and event its published description lists.",
  calls: {
    "authTest": Blueprint.call({ errors }),
    "chatDelete": Blueprint.call({ errors }),
    "chatPostMessage": Blueprint.call({ errors }),
    "conversationsHistory": Blueprint.call({ errors }),
    "conversationsReplies": Blueprint.call({ errors }),
    "usergroupsUsersList": Blueprint.call({ errors }),
  },
  events: {
    ...written,
  },
  standIn,
  ...(door === undefined ? {} : { door }),
});
