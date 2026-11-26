// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/safe/record-company.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Record a company's Safe, owned by its founder's own Safe, at the address it will have once deployed. */
export const recordCompany = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, true, Effect.flatMap(Capxul, (client) => client.safe["record-company"]({ payload })));
