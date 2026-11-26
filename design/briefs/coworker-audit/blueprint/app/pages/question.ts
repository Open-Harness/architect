import { Blueprint } from "orthograph";
import { Ask } from "../../things/ask/thing.ts";
import get from "../../things/ask/verbs/get.ts";
import answer from "../../things/ask/verbs/answer.ts";
import inbox from "./inbox.ts";

// "A question, as a page" (docs/screens.md: Adapt, from `detail-page`). Declares the what, never the look (K31).
export default Blueprint.page({
  description: "One thing waiting on you: what happened, what the manager knows, the options, and your answer.",
  route: { path: "/inbox/:ask", params: { ask: Ask.fields.id } },
  parent: inbox,
  allowed: [Blueprint.signedIn],
  shows: [get],
  offers: [answer],
});
