// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/cost-center/create.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Add a cost center to a company, under a group or as a root. Each flag is handed on as text; the declaration decodes it; a flag left out is not sent. `--json` prints the whole answer as JSON. */
export const create = Command.make(
  "create",
  { company: Flag.String("company").pipe(Flag.withMetavar("id"), Flag.withDescription("Cost center company: an id (com_...).")), costCenterName: Flag.String("costCenterName").pipe(Flag.withMetavar("name"), Flag.withDescription("Cost center cost center name: text of up to 140 characters.")), parentCostCenter: Flag.optional(Flag.String("parentCostCenter").pipe(Flag.withMetavar("id"), Flag.withDescription("Cost center parent cost center: an id (cct_...)."))), isGroup: Flag.String("isGroup").pipe(Flag.withMetavar("yes-no"), Flag.withDescription("Make it a group, which other cost centers sit under, rather than a ledger, which takes entries. Text.")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(Output.supplied(flags)).pipe(Effect.flatMap(Sdk.costCenter.create), Output.answer(json)),
).pipe(Command.withDescription("Add a cost center to a company, under a group or as a root. Creates a cost center, which starts group or ledger."));
