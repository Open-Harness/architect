import { Blueprint, Schema } from "orthograph";

/** What a person signs in with. Never stored by the project: Better Auth keeps only its hash. Secret: never in telemetry. */
export const Password = Blueprint.visibility.secret(Blueprint.text({ max: 128 }));
/** A secret shown once: a session's bearer token, or an API key. Secret: never in telemetry. */
export const Secret = Blueprint.visibility.secret(Blueprint.text({ max: 512 }));
/** How a call got in, as `session.show` answers it (M2-auth, "What each plugin owns"). */
export const Way = Blueprint.value(Schema.Literals(["session", "key", "device", "agent"]));
