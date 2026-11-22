import { Blueprint } from "orthograph";
import { Membership } from "./thing.ts";
import { Count } from "../../values/counts.ts";
import { Instant } from "../../values/time.ts";

export const MembershipStarted = Blueprint.event({ membership: Membership.fields.id, startedAt: Instant });
export const MembershipRenewed = Blueprint.event({ membership: Membership.fields.id, period: Count, at: Instant });
export const PaymentMissed = Blueprint.event({ membership: Membership.fields.id, overdueAt: Instant });
export const PaymentMade = Blueprint.event({ membership: Membership.fields.id });
export const MembershipLapsed = Blueprint.event({ membership: Membership.fields.id, at: Instant });
