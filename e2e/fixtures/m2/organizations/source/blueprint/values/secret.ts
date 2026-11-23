import { Blueprint } from "orthograph";

/** A secret shown once: an API key. Secret: never in telemetry. */
export const Secret = Blueprint.visibility.secret(Blueprint.text({ max: 512 }));
