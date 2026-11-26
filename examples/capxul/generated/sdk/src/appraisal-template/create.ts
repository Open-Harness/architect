// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/appraisal-template/create.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Make an appraisal template: KRAs and rating criteria, each with its weightage. */
export const create = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, true, Effect.flatMap(Capxul, (client) => client["appraisal-template"].create({ payload })));
