// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/decision/route.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Route an eval's items: one to twenty, each accept, attach, stop or ignore. An explicit request makes its ticket in every mode; in observe an inferred accept is only recorded as one it would make. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const route = Command.make(
  "route",
  { superagent: Flag.String("superagent").pipe(Flag.withMetavar("id"), Flag.withDescription("Decision superagent: an id (sag_...).")), eval: Flag.String("eval").pipe(Flag.withMetavar("id"), Flag.withDescription("Decision eval: an id (evl_...).")), items: Flag.String("items").pipe(Flag.withMetavar("text"), Flag.withDescription("Decision items: text.")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.decision.route), Output.answer(json)),
).pipe(Command.withDescription("Route an eval's items: one to twenty, each accept, attach, stop or ignore. An explicit request makes its ticket in every mode; in observe an inferred accept is only recorded as one it would make. Creates a decision, which starts recorded."));
