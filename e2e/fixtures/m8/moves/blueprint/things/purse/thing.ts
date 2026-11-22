import { Blueprint } from "orthograph";
import { Count } from "../../values/counts.ts";
import { Instant } from "../../values/time.ts";

export const Purse = Blueprint.thing({
  description: "Money to spend up to a limit each month, counted in months from when it opened.",
  fields: { id: Blueprint.id("pur"), limit: Count, spent: Count, openedAt: Instant, period: Count },
});
