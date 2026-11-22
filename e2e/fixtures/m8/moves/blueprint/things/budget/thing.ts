import { Blueprint } from "orthograph";
import { Count, Title } from "../../values/counts.ts";
import { Instant } from "../../values/time.ts";

export const Budget = Blueprint.thing({
  description: "A London office's budget: reset on pay day, the 25th, and reported on the month's last day, both by London's calendar.",
  fields: { id: Blueprint.id("bud"), title: Title, openedAt: Instant, resets: Count, reports: Count },
});
