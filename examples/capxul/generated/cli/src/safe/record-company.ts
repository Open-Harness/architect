// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/safe/record-company.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Record a company's Safe, owned by its founder's own Safe, at the address it will have once deployed. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const recordCompany = Command.make(
  "record-company",
  { company: Flag.String("company").pipe(Flag.withMetavar("id"), Flag.withDescription("The company whose Safe it is. An id (com_...).")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.safe.recordCompany), Output.answer(json)),
).pipe(Command.withDescription("Record a company's Safe, owned by its founder's own Safe, at the address it will have once deployed. Creates a safe, which starts counterfactual."));
