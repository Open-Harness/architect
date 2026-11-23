// Generated from blueprint/projections/api.ts. Do not edit.
import { Schema } from "effect";
import { ErrorNames, wireStruct } from "orthograph/server";
import * as Handle from "../../../blueprint/things/handle/errors.ts";
import * as Link from "../../../blueprint/things/link/errors.ts";
import * as Profile from "../../../blueprint/things/profile/errors.ts";

/** Every refusal's code, its exit for the CLI and its HTTP status: one row each, read by the CLI, HTTP and MCP. */
export const refusals = {
  HandleTaken: { code: "HN-001", exit: 10, status: 422 },
  HandleAlreadyOwned: { code: "HN-002", exit: 12, status: 422 },
  HandleNotFound: { code: "HN-003", exit: 13, status: 404 },
  LinkNeedsHandle: { code: "LN-001", exit: 30, status: 422 },
  LinkAlreadyRemoved: { code: "LN-002", exit: 32, status: 422 },
  ProfileNotFound: { code: "PR-001", exit: 20, status: 404 },
  HandleNotClaimed: { code: "HN-900", exit: 11, status: 409 },
  LinkNotListed: { code: "LN-900", exit: 31, status: 409 },
  NotAllowed: { code: "AR-001", exit: 3, status: 403 },
  IdempotencyConflict: { code: "AR-002", exit: 120, status: 409 },
} as const;
type Refusal = keyof typeof refusals;

ErrorNames.name(Handle.HandleTaken, "HandleTaken");
export class HandleTaken extends Schema.TaggedError<HandleTaken>()("HandleTaken", { code: Schema.Literal(refusals.HandleTaken.code), ...wireStruct(Handle.HandleTaken.fields).fields }, { httpApiStatus: refusals.HandleTaken.status }) { static readonly code = refusals.HandleTaken.code; }
ErrorNames.name(Handle.HandleAlreadyOwned, "HandleAlreadyOwned");
export class HandleAlreadyOwned extends Schema.TaggedError<HandleAlreadyOwned>()("HandleAlreadyOwned", { code: Schema.Literal(refusals.HandleAlreadyOwned.code), ...wireStruct(Handle.HandleAlreadyOwned.fields).fields }, { httpApiStatus: refusals.HandleAlreadyOwned.status }) { static readonly code = refusals.HandleAlreadyOwned.code; }
ErrorNames.name(Handle.HandleNotFound, "HandleNotFound");
export class HandleNotFound extends Schema.TaggedError<HandleNotFound>()("HandleNotFound", { code: Schema.Literal(refusals.HandleNotFound.code), ...wireStruct(Handle.HandleNotFound.fields).fields }, { httpApiStatus: refusals.HandleNotFound.status }) { static readonly code = refusals.HandleNotFound.code; }
ErrorNames.name(Link.LinkNeedsHandle, "LinkNeedsHandle");
export class LinkNeedsHandle extends Schema.TaggedError<LinkNeedsHandle>()("LinkNeedsHandle", { code: Schema.Literal(refusals.LinkNeedsHandle.code), ...wireStruct(Link.LinkNeedsHandle.fields).fields }, { httpApiStatus: refusals.LinkNeedsHandle.status }) { static readonly code = refusals.LinkNeedsHandle.code; }
ErrorNames.name(Link.LinkAlreadyRemoved, "LinkAlreadyRemoved");
export class LinkAlreadyRemoved extends Schema.TaggedError<LinkAlreadyRemoved>()("LinkAlreadyRemoved", { code: Schema.Literal(refusals.LinkAlreadyRemoved.code), ...wireStruct(Link.LinkAlreadyRemoved.fields).fields }, { httpApiStatus: refusals.LinkAlreadyRemoved.status }) { static readonly code = refusals.LinkAlreadyRemoved.code; }
ErrorNames.name(Profile.ProfileNotFound, "ProfileNotFound");
export class ProfileNotFound extends Schema.TaggedError<ProfileNotFound>()("ProfileNotFound", { code: Schema.Literal(refusals.ProfileNotFound.code), ...wireStruct(Profile.ProfileNotFound.fields).fields }, { httpApiStatus: refusals.ProfileNotFound.status }) { static readonly code = refusals.ProfileNotFound.code; }
export class HandleNotClaimed extends Schema.TaggedError<HandleNotClaimed>()("HandleNotClaimed", { code: Schema.Literal(refusals.HandleNotClaimed.code), ...{ state: Schema.Literals(["claimed", "released"]) } }, { httpApiStatus: refusals.HandleNotClaimed.status }) { static readonly code = refusals.HandleNotClaimed.code; }
export class LinkNotListed extends Schema.TaggedError<LinkNotListed>()("LinkNotListed", { code: Schema.Literal(refusals.LinkNotListed.code), ...{ state: Schema.Literals(["listed", "removed"]) } }, { httpApiStatus: refusals.LinkNotListed.status }) { static readonly code = refusals.LinkNotListed.code; }
export class NotAllowed extends Schema.TaggedError<NotAllowed>()("NotAllowed", { code: Schema.Literal(refusals.NotAllowed.code), ...{} }, { httpApiStatus: refusals.NotAllowed.status }) { static readonly code = refusals.NotAllowed.code; }
export class IdempotencyConflict extends Schema.TaggedError<IdempotencyConflict>()("IdempotencyConflict", { code: Schema.Literal(refusals.IdempotencyConflict.code), ...{} }, { httpApiStatus: refusals.IdempotencyConflict.status }) { static readonly code = refusals.IdempotencyConflict.code; }

/** Each refusal's exit code, for the CLI: read from `refusals`. */
export const exits = Object.fromEntries(Object.entries(refusals).map(([k, r]) => [k, r.exit])) as { readonly [K in Refusal]: (typeof refusals)[K]["exit"] };

/** Each refusal's code, stable across targets: `[AL-002] Name { field: value }`. Beside the tag, never in place of it. Read from `refusals`. */
export const codes = Object.fromEntries(Object.entries(refusals).map(([k, r]) => [k, r.code])) as { readonly [K in Refusal]: (typeof refusals)[K]["code"] };

/** The declared errors themselves, by name: their fields say who may see a value (the visibility rule cuts a refusal by them). */
export const declared = {
  HandleTaken: Handle.HandleTaken,
  HandleAlreadyOwned: Handle.HandleAlreadyOwned,
  HandleNotFound: Handle.HandleNotFound,
  LinkNeedsHandle: Link.LinkNeedsHandle,
  LinkAlreadyRemoved: Link.LinkAlreadyRemoved,
  ProfileNotFound: Profile.ProfileNotFound,
} as const;

/** The wire class of each refusal, by name. */
export const wire = { HandleTaken, HandleAlreadyOwned, HandleNotFound, LinkNeedsHandle, LinkAlreadyRemoved, ProfileNotFound, HandleNotClaimed, LinkNotListed, NotAllowed, IdempotencyConflict };
