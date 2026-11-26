import { Blueprint } from "orthograph";
import { Count, Title } from "../../values/counts.ts";
import { Instant } from "../../values/time.ts";

export const Watch = Blueprint.thing({
  description: "A watch on something slow: the keeper observes it at `nextCheckAt`, backing off one, two, then four hours, and parks it after the third.",
  fields: { id: Blueprint.id("wch"), name: Title, nextCheckAt: Instant, checks: Count },
});
