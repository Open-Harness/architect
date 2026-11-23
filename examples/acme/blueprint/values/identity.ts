import { Blueprint, Schema } from "orthograph";

/** What a person signs in with. Never stored by the project: Better Auth keeps only its hash. Secret: never in telemetry. */
export const Password = Blueprint.visibility.secret(Blueprint.text({ max: 128 }));
/** A secret shown once: a session's bearer token, or an API key. Secret: never in telemetry. */
export const Secret = Blueprint.visibility.secret(Blueprint.text({ max: 512 }));
/** A place in an organisation. */
export const Role = Blueprint.value(Schema.Literals(["owner", "member"]));
/** The application answered. */
export const Ok = Blueprint.value(Schema.Literal("ok"));
/**
 * How a call got in, as `session.show` answers it (M2.03, `design/decisions/M2-auth.md`): `Way` in `orthograph` is the same four
 * words as a TypeScript type, and the declaration here is the value a field is made of.
 */
export const Way = Blueprint.value(Schema.Literals(["session", "key", "device", "agent"]));
