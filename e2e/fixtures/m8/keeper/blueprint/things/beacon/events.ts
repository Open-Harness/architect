import { Blueprint } from "orthograph";
import { Beacon } from "./thing.ts";
import { Count } from "../../values/counts.ts";
import { Instant } from "../../values/time.ts";

export const BeaconLit = Blueprint.event({ beacon: Beacon.fields.id, litAt: Instant });
export const BeaconPinged = Blueprint.event({ beacon: Beacon.fields.id, pings: Count, at: Instant });
export const BeaconTended = Blueprint.event({ beacon: Beacon.fields.id });
export const BeaconDoused = Blueprint.event({ beacon: Beacon.fields.id });
