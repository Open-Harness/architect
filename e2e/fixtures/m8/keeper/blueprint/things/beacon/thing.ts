import { Blueprint } from "orthograph";
import { Count, Title } from "../../values/counts.ts";
import { Instant } from "../../values/time.ts";

export const Beacon = Blueprint.thing({
  description: "A beacon: pinged by the keeper every hour from the moment it was lit, until it is doused.",
  fields: { id: Blueprint.id("bcn"), name: Title, litAt: Instant, lastPingAt: Instant, pings: Count },
});
