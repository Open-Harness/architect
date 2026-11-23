// Generated from the blueprint. Do not edit.
import { Schema } from "effect";
import { ErrorNames, wireStruct } from "orthograph/server";
import * as Sheet from "../../../blueprint/things/sheet/errors.ts";

/** Every refusal's code, its exit for the CLI and its HTTP status: one row each, read by the CLI, HTTP and MCP. */
export const refusals = {
  SheetFull: { code: "SH-001", exit: 71, status: 422 },
  SheetNotOpen: { code: "SH-900", exit: 70, status: 409 },
  SheetNotFound: { code: "SH-901", exit: 4, status: 404 },
  NotAllowed: { code: "AR-001", exit: 3, status: 403 },
  IdempotencyConflict: { code: "AR-002", exit: 120, status: 409 },
} as const;
type Refusal = keyof typeof refusals;

ErrorNames.name(Sheet.SheetFull, "SheetFull");
export class SheetFull extends Schema.TaggedError<SheetFull>()("SheetFull", { code: Schema.Literal(refusals.SheetFull.code), ...wireStruct(Sheet.SheetFull.fields).fields }, { httpApiStatus: refusals.SheetFull.status }) { static readonly code = refusals.SheetFull.code; }
export class SheetNotOpen extends Schema.TaggedError<SheetNotOpen>()("SheetNotOpen", { code: Schema.Literal(refusals.SheetNotOpen.code), ...{ state: Schema.Literals(["open", "full", "closed"]) } }, { httpApiStatus: refusals.SheetNotOpen.status }) { static readonly code = refusals.SheetNotOpen.code; }
export class SheetNotFound extends Schema.TaggedError<SheetNotFound>()("SheetNotFound", { code: Schema.Literal(refusals.SheetNotFound.code), ...{ id: Schema.String } }, { httpApiStatus: refusals.SheetNotFound.status }) { static readonly code = refusals.SheetNotFound.code; }
export class NotAllowed extends Schema.TaggedError<NotAllowed>()("NotAllowed", { code: Schema.Literal(refusals.NotAllowed.code), ...{} }, { httpApiStatus: refusals.NotAllowed.status }) { static readonly code = refusals.NotAllowed.code; }
export class IdempotencyConflict extends Schema.TaggedError<IdempotencyConflict>()("IdempotencyConflict", { code: Schema.Literal(refusals.IdempotencyConflict.code), ...{} }, { httpApiStatus: refusals.IdempotencyConflict.status }) { static readonly code = refusals.IdempotencyConflict.code; }

/** Each refusal's exit code, for the CLI: read from `refusals`. */
export const exits = Object.fromEntries(Object.entries(refusals).map(([k, r]) => [k, r.exit])) as { readonly [K in Refusal]: (typeof refusals)[K]["exit"] };

/** Each refusal's code, stable across targets: `[AL-002] Name { field: value }`. Beside the tag, never in place of it. Read from `refusals`. */
export const codes = Object.fromEntries(Object.entries(refusals).map(([k, r]) => [k, r.code])) as { readonly [K in Refusal]: (typeof refusals)[K]["code"] };

/** The declared errors themselves, by name: their fields say who may see a value (the visibility rule cuts a refusal by them). */
export const declared = {
  SheetFull: Sheet.SheetFull,
} as const;

/** The wire class of each refusal, by name. */
export const wire = { SheetFull, SheetNotOpen, SheetNotFound, NotAllowed, IdempotencyConflict };
