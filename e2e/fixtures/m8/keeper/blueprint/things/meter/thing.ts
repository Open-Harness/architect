import { Blueprint } from "orthograph";
import { Count, Title } from "../../values/counts.ts";
import { Instant } from "../../values/time.ts";

export const Meter = Blueprint.thing({
  description: "A meter the keeper reads every hour from the moment it started; a jammed meter refuses the reading, and the next hour's reading goes on.",
  fields: { id: Blueprint.id("mtr"), name: Title, startedAt: Instant, jammed: Count, ticks: Count },
});
