import { Blueprint } from "orthograph";
import { Meter } from "./thing.ts";
import { Count } from "../../values/counts.ts";
import { Instant } from "../../values/time.ts";

export const MeterStarted = Blueprint.event({ meter: Meter.fields.id, startedAt: Instant });
export const MeterJams = Blueprint.event({ meter: Meter.fields.id });
export const MeterFreed = Blueprint.event({ meter: Meter.fields.id });
export const MeterTicked = Blueprint.event({ meter: Meter.fields.id, ticks: Count, at: Instant });
