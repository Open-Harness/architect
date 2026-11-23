// Generated from blueprint/projections/api.ts. Do not edit.
import { Schema } from "effect";
import { ErrorNames, wireStruct } from "orthograph/server";
import * as Allowance from "../../../blueprint/things/allowance/errors.ts";
import * as Person from "../../../blueprint/things/person/errors.ts";
import * as Session from "../../../blueprint/things/session/errors.ts";

/** Every refusal's code, its exit for the CLI and its HTTP status: one row each, read by the CLI, HTTP and MCP. */
export const refusals = {
  AllowanceExceeded: { code: "AL-001", exit: 41, status: 422 },
  AllowanceNotFound: { code: "AL-002", exit: 43, status: 404 },
  AllowanceLimitTooHigh: { code: "AL-003", exit: 44, status: 422 },
  PersonEmailTaken: { code: "PE-001", exit: 11, status: 422 },
  SessionCredentialsWrong: { code: "SE-001", exit: 10, status: 422 },
  AllowanceNotActive: { code: "AL-900", exit: 40, status: 409 },
  InvitationNotPending: { code: "IN-900", exit: 40, status: 409 },
  OrganizationNotActive: { code: "OR-900", exit: 20, status: 409 },
  PersonNotFound: { code: "PE-901", exit: 4, status: 404 },
  NotAllowed: { code: "AR-001", exit: 3, status: 403 },
  IdempotencyConflict: { code: "AR-002", exit: 120, status: 409 },
} as const;
type Refusal = keyof typeof refusals;

ErrorNames.name(Allowance.AllowanceExceeded, "AllowanceExceeded");
export class AllowanceExceeded extends Schema.TaggedError<AllowanceExceeded>()("AllowanceExceeded", { code: Schema.Literal(refusals.AllowanceExceeded.code), ...wireStruct(Allowance.AllowanceExceeded.fields).fields }, { httpApiStatus: refusals.AllowanceExceeded.status }) { static readonly code = refusals.AllowanceExceeded.code; }
ErrorNames.name(Allowance.AllowanceNotFound, "AllowanceNotFound");
export class AllowanceNotFound extends Schema.TaggedError<AllowanceNotFound>()("AllowanceNotFound", { code: Schema.Literal(refusals.AllowanceNotFound.code), ...wireStruct(Allowance.AllowanceNotFound.fields).fields }, { httpApiStatus: refusals.AllowanceNotFound.status }) { static readonly code = refusals.AllowanceNotFound.code; }
ErrorNames.name(Allowance.AllowanceLimitTooHigh, "AllowanceLimitTooHigh");
export class AllowanceLimitTooHigh extends Schema.TaggedError<AllowanceLimitTooHigh>()("AllowanceLimitTooHigh", { code: Schema.Literal(refusals.AllowanceLimitTooHigh.code), ...wireStruct(Allowance.AllowanceLimitTooHigh.fields).fields }, { httpApiStatus: refusals.AllowanceLimitTooHigh.status }) { static readonly code = refusals.AllowanceLimitTooHigh.code; }
ErrorNames.name(Person.PersonEmailTaken, "PersonEmailTaken");
export class PersonEmailTaken extends Schema.TaggedError<PersonEmailTaken>()("PersonEmailTaken", { code: Schema.Literal(refusals.PersonEmailTaken.code), ...wireStruct(Person.PersonEmailTaken.fields).fields }, { httpApiStatus: refusals.PersonEmailTaken.status }) { static readonly code = refusals.PersonEmailTaken.code; }
ErrorNames.name(Session.SessionCredentialsWrong, "SessionCredentialsWrong");
export class SessionCredentialsWrong extends Schema.TaggedError<SessionCredentialsWrong>()("SessionCredentialsWrong", { code: Schema.Literal(refusals.SessionCredentialsWrong.code), ...wireStruct(Session.SessionCredentialsWrong.fields).fields }, { httpApiStatus: refusals.SessionCredentialsWrong.status }) { static readonly code = refusals.SessionCredentialsWrong.code; }
export class AllowanceNotActive extends Schema.TaggedError<AllowanceNotActive>()("AllowanceNotActive", { code: Schema.Literal(refusals.AllowanceNotActive.code), ...{ state: Schema.Literals(["active", "exhausted", "revoked"]) } }, { httpApiStatus: refusals.AllowanceNotActive.status }) { static readonly code = refusals.AllowanceNotActive.code; }
export class InvitationNotPending extends Schema.TaggedError<InvitationNotPending>()("InvitationNotPending", { code: Schema.Literal(refusals.InvitationNotPending.code), ...{ state: Schema.Literals(["pending", "accepted", "revoked"]) } }, { httpApiStatus: refusals.InvitationNotPending.status }) { static readonly code = refusals.InvitationNotPending.code; }
export class OrganizationNotActive extends Schema.TaggedError<OrganizationNotActive>()("OrganizationNotActive", { code: Schema.Literal(refusals.OrganizationNotActive.code), ...{ state: Schema.Literals(["active"]) } }, { httpApiStatus: refusals.OrganizationNotActive.status }) { static readonly code = refusals.OrganizationNotActive.code; }
export class PersonNotFound extends Schema.TaggedError<PersonNotFound>()("PersonNotFound", { code: Schema.Literal(refusals.PersonNotFound.code), ...{ id: Schema.String } }, { httpApiStatus: refusals.PersonNotFound.status }) { static readonly code = refusals.PersonNotFound.code; }
export class NotAllowed extends Schema.TaggedError<NotAllowed>()("NotAllowed", { code: Schema.Literal(refusals.NotAllowed.code), ...{} }, { httpApiStatus: refusals.NotAllowed.status }) { static readonly code = refusals.NotAllowed.code; }
export class IdempotencyConflict extends Schema.TaggedError<IdempotencyConflict>()("IdempotencyConflict", { code: Schema.Literal(refusals.IdempotencyConflict.code), ...{} }, { httpApiStatus: refusals.IdempotencyConflict.status }) { static readonly code = refusals.IdempotencyConflict.code; }

/** Each refusal's exit code, for the CLI: read from `refusals`. */
export const exits = Object.fromEntries(Object.entries(refusals).map(([k, r]) => [k, r.exit])) as { readonly [K in Refusal]: (typeof refusals)[K]["exit"] };

/** Each refusal's code, stable across targets: `[AL-002] Name { field: value }`. Beside the tag, never in place of it. Read from `refusals`. */
export const codes = Object.fromEntries(Object.entries(refusals).map(([k, r]) => [k, r.code])) as { readonly [K in Refusal]: (typeof refusals)[K]["code"] };

/** The declared errors themselves, by name: their fields say who may see a value (the visibility rule cuts a refusal by them). */
export const declared = {
  AllowanceExceeded: Allowance.AllowanceExceeded,
  AllowanceNotFound: Allowance.AllowanceNotFound,
  AllowanceLimitTooHigh: Allowance.AllowanceLimitTooHigh,
  PersonEmailTaken: Person.PersonEmailTaken,
  SessionCredentialsWrong: Session.SessionCredentialsWrong,
} as const;

/** The wire class of each refusal, by name. */
export const wire = { AllowanceExceeded, AllowanceNotFound, AllowanceLimitTooHigh, PersonEmailTaken, SessionCredentialsWrong, AllowanceNotActive, InvitationNotPending, OrganizationNotActive, PersonNotFound, NotAllowed, IdempotencyConflict };
