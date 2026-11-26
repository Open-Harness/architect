import { Blueprint } from "orthograph";
import { Watch } from "./thing.ts";
import { Count } from "../../values/counts.ts";
import { Instant } from "../../values/time.ts";

export const WatchStarted = Blueprint.event({ watch: Watch.fields.id, nextCheckAt: Instant });
export const WatchSnoozed = Blueprint.event({ watch: Watch.fields.id, nextCheckAt: Instant });
export const WatchHushed = Blueprint.event({ watch: Watch.fields.id });
export const WatchObserved = Blueprint.event({ watch: Watch.fields.id, checks: Count, nextCheckAt: Instant });
