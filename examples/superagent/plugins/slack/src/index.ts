// Generated from Slack Web API 1.7.0. Do not edit.
import { Blueprint } from "orthograph";
import { events as written, standIn } from "./written.ts";

export default Blueprint.adapter({
  description: "Slack Web API 1.7.0: every call and event its published description lists.",
  calls: {
    "authTest": Blueprint.call(),
    "chatDelete": Blueprint.call(),
    "chatPostMessage": Blueprint.call(),
    "conversationsHistory": Blueprint.call(),
    "conversationsReplies": Blueprint.call(),
  },
  events: {
    ...written,
  },
  standIn,
});
