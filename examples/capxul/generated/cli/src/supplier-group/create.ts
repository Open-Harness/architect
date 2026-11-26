// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/supplier-group/create.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Add a supplier group to a company, under a group or as its one root. Each flag is handed on as text; the declaration decodes it; a flag left out is not sent. `--json` prints the whole answer as JSON. */
export const create = Command.make(
  "create",
  { company: Flag.String("company").pipe(Flag.withMetavar("id"), Flag.withDescription("Supplier group company: an id (com_...).")), supplierGroupName: Flag.String("supplierGroupName").pipe(Flag.withMetavar("name"), Flag.withDescription("Supplier group supplier group name: text of up to 140 characters.")), parentSupplierGroup: Flag.optional(Flag.String("parentSupplierGroup").pipe(Flag.withMetavar("id"), Flag.withDescription("Supplier group parent supplier group: an id (sgr_...)."))), isGroup: Flag.String("isGroup").pipe(Flag.withMetavar("yes-no"), Flag.withDescription("Make it a group, which other supplier groups sit under, rather than a ledger, which suppliers are put in. Text.")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(Output.supplied(flags)).pipe(Effect.flatMap(Sdk.supplierGroup.create), Output.answer(json)),
).pipe(Command.withDescription("Add a supplier group to a company, under a group or as its one root. Creates a supplier group, which starts group or ledger."));
