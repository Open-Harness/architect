import { Blueprint } from "orthograph";
import { Membership } from "./thing.ts";
import { Count } from "../../values/counts.ts";
import { Instant } from "../../values/time.ts";

export const MembershipStarted = Blueprint.event({ membership: Membership.fields.id, startedAt: Instant });
/** `at` is the world's time when the renewal ran: the instant it was due, in a stepped world. */
export const MembershipRenewed = Blueprint.event({ membership: Membership.fields.id, period: Count, at: Instant });
