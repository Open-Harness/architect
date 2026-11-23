// The rule itself: who is shown a value declared with which visibility. Nothing here knows an output.
import type { FieldInput, Role } from "orthograph";
import { traceable } from "orthograph/server";
import type { Audience } from "../types.ts";

const holds = (visibility: FieldInput["visibility"], held: ReadonlyArray<Role<any>>): boolean =>
  typeof visibility === "object" && visibility.to.some((role) => held.includes(role));

/** Whether `audience` is shown a value declared as `field`. */
export const sees = (audience: Audience, field: FieldInput): boolean => {
  const v = field.visibility;
  switch (audience.kind) {
    case "principal": return v === "public" || holds(v, audience.held) || (v === "secret" && audience.issuing && field.issued === true);
    case "agent": return v === "public" || holds(v, audience.held);
    case "telemetry": return traceable(field);
    case "public": return v === "public";
    case "owner": return v !== "secret";
  }
};

/** How a schema for `audience` names a field: always there, there for some callers, or not at all. */
export type Presence = "required" | "optional" | "absent";

export const presence = (audience: Audience, field: FieldInput): Presence => {
  const v = field.visibility;
  switch (audience.kind) {
    // The wire's schema: a client decodes what a server sent, so every declared field is named and only the ones every
    // caller is shown (public, or the secret this call issued) are required.
    case "principal": return v === "public" || (audience.issuing && field.issued === true) ? "required" : "optional";
    case "agent": return v === "public" ? "required" : typeof v === "object" ? "optional" : "absent";
    default: return sees(audience, field) ? "required" : "absent";
  }
};
