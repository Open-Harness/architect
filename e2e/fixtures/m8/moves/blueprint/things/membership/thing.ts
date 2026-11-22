import { Blueprint } from "orthograph";
import { Count, Title } from "../../values/counts.ts";
import { Instant } from "../../values/time.ts";

export const Membership = Blueprint.thing({
  description: "A club membership: renewed each month from the moment it started, and lapsed fourteen days after a missed payment.",
  fields: { id: Blueprint.id("mbr"), name: Title, startedAt: Instant, overdueAt: Instant, period: Count, renewals: Count },
});
