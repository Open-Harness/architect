import { Blueprint } from "orthograph";
import { Count, Title } from "../../values/counts.ts";
import { Instant } from "../../values/time.ts";

export const Watch = Blueprint.thing({
  description: "A watch on something slow: the keeper observes it at `nextCheckAt`, first an hour after it starts, then backing off two and four hours, and parks it after the third; hushing it clears `nextCheckAt`, so nothing is checked.",
  fields: { id: Blueprint.id("wch"), name: Title, nextCheckAt: Blueprint.optional(Instant), checks: Count },
});
