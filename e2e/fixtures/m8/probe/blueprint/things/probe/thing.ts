import { Blueprint } from "orthograph";

/** Epoch milliseconds, as a whole number: the probe reports instants as numbers so it needs nothing of time's surface. */
export const Millis = Blueprint.value(Blueprint.uint(64));

export const Probe = Blueprint.thing({
  description: "Reports what each part of the world reads as now.",
  fields: { id: Blueprint.id("prb"), clock: Millis, stored: Millis },
});
