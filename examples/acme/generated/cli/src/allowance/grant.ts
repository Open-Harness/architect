// Generated from blueprint/projections/cli.ts. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/allowance/grant.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Let a member spend from the organisation, up to a limit each month. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const grant = Command.make(
  "grant",
  { organization: Flag.String("organization").pipe(Flag.withMetavar("id"), Flag.withDescription("Allowance organization: an id (org_...).")), member: Flag.String("member").pipe(Flag.withMetavar("id"), Flag.withDescription("Allowance member: an id (per_...).")), limit: Flag.String("limit").pipe(Flag.withMetavar("uint"), Flag.withDescription("Allowance limit: a whole number below 2^128.")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.allowance.grant), Output.answer(json)),
).pipe(Command.withDescription("Let a member spend from the organisation, up to a limit each month. Creates an allowance, which starts active."));
