// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/supplier/create.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Add a supplier to a company. Each flag is handed on as text; the declaration decodes it; a flag left out is not sent. `--json` prints the whole answer as JSON. */
export const create = Command.make(
  "create",
  { company: Flag.String("company").pipe(Flag.withMetavar("id"), Flag.withDescription("Supplier company: an id (com_...).")), supplierName: Flag.String("supplierName").pipe(Flag.withMetavar("name"), Flag.withDescription("Supplier supplier name: text of up to 140 characters.")), supplierType: Flag.String("supplierType").pipe(Flag.withMetavar("party-kind"), Flag.withDescription("Supplier supplier type: text.")), supplierGroup: Flag.optional(Flag.String("supplierGroup").pipe(Flag.withMetavar("id"), Flag.withDescription("Supplier supplier group: an id (sgr_...)."))), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(Output.supplied(flags)).pipe(Effect.flatMap(Sdk.supplier.create), Output.answer(json)),
).pipe(Command.withDescription("Add a supplier to a company. Creates a supplier, which starts active."));
