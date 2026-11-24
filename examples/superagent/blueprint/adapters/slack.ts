import { Blueprint } from "orthograph";
import slack from "@orthograph/slack";

/** What this app uses of Slack: replies in a thread, a thread's history, a user group's members, and the two events it listens to. */
export default Blueprint.use(slack, (s) => [
  s.include(s.calls.chatPostMessage),
  s.include(s.calls.conversationsReplies),
  s.include(s.calls.usergroupsUsersList),
  s.include(s.events.appMention),
  s.include(s.events.message),
]);
