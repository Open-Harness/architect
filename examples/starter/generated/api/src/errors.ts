// Generated from the blueprint. Do not edit.
import { Schema } from "effect";
import { ErrorNames, wireStruct } from "orthograph/server";
import * as Person from "../../../blueprint/things/person/errors.ts";
import * as Session from "../../../blueprint/things/session/errors.ts";

/** Every refusal's code, its exit for the CLI and its HTTP status: one row each, read by the CLI, HTTP and MCP. */
export const refusals = {
  PersonEmailTaken: { code: "PE-001", exit: 11, status: 422 },
  SessionCredentialsWrong: { code: "SE-001", exit: 10, status: 422 },
  InvitationNotPending: { code: "IN-900", exit: 40, status: 409 },
  OrganizationNotActive: { code: "OR-900", exit: 20, status: 409 },
  NotAllowed: { code: "AR-001", exit: 3, status: 403 },
  IdempotencyConflict: { code: "AR-002", exit: 120, status: 409 },
} as const;
type Refusal = keyof typeof refusals;

ErrorNames.name(Person.PersonEmailTaken, "PersonEmailTaken");
export class PersonEmailTaken extends Schema.TaggedError<PersonEmailTaken>()("PersonEmailTaken", { code: Schema.Literal(refusals.PersonEmailTaken.code), ...wireStruct(Person.PersonEmailTaken.fields).fields }, { httpApiStatus: refusals.PersonEmailTaken.status }) { static readonly code = refusals.PersonEmailTaken.code; }
ErrorNames.name(Session.SessionCredentialsWrong, "SessionCredentialsWrong");
export class SessionCredentialsWrong extends Schema.TaggedError<SessionCredentialsWrong>()("SessionCredentialsWrong", { code: Schema.Literal(refusals.SessionCredentialsWrong.code), ...wireStruct(Session.SessionCredentialsWrong.fields).fields }, { httpApiStatus: refusals.SessionCredentialsWrong.status }) { static readonly code = refusals.SessionCredentialsWrong.code; }
export class InvitationNotPending extends Schema.TaggedError<InvitationNotPending>()("InvitationNotPending", { code: Schema.Literal(refusals.InvitationNotPending.code), ...{ state: Schema.Literals(["pending", "accepted", "revoked"]) } }, { httpApiStatus: refusals.InvitationNotPending.status }) { static readonly code = refusals.InvitationNotPending.code; }
export class OrganizationNotActive extends Schema.TaggedError<OrganizationNotActive>()("OrganizationNotActive", { code: Schema.Literal(refusals.OrganizationNotActive.code), ...{ state: Schema.Literals(["active"]) } }, { httpApiStatus: refusals.OrganizationNotActive.status }) { static readonly code = refusals.OrganizationNotActive.code; }
export class NotAllowed extends Schema.TaggedError<NotAllowed>()("NotAllowed", { code: Schema.Literal(refusals.NotAllowed.code), ...{} }, { httpApiStatus: refusals.NotAllowed.status }) { static readonly code = refusals.NotAllowed.code; }
export class IdempotencyConflict extends Schema.TaggedError<IdempotencyConflict>()("IdempotencyConflict", { code: Schema.Literal(refusals.IdempotencyConflict.code), ...{} }, { httpApiStatus: refusals.IdempotencyConflict.status }) { static readonly code = refusals.IdempotencyConflict.code; }

/** Each refusal's exit code, for the CLI: read from `refusals`. */
export const exits = Object.fromEntries(Object.entries(refusals).map(([k, r]) => [k, r.exit])) as { readonly [K in Refusal]: (typeof refusals)[K]["exit"] };

/** Each refusal's code, stable across targets: `[AL-002] Name { field: value }`. Beside the tag, never in place of it. Read from `refusals`. */
export const codes = Object.fromEntries(Object.entries(refusals).map(([k, r]) => [k, r.code])) as { readonly [K in Refusal]: (typeof refusals)[K]["code"] };

/** The declared errors themselves, by name: their fields say who may see a value (the visibility rule cuts a refusal by them). */
export const declared = {
  PersonEmailTaken: Person.PersonEmailTaken,
  SessionCredentialsWrong: Session.SessionCredentialsWrong,
} as const;

/** The wire class of each refusal, by name. */
export const wire = { PersonEmailTaken, SessionCredentialsWrong, InvitationNotPending, OrganizationNotActive, NotAllowed, IdempotencyConflict };
