// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/decision/route.ts";
import { SuperagentClient, call, type CallOptions } from "../client.ts";

/** Route an eval's items: one to twenty, each accept, attach, stop or ignore. An explicit request makes its ticket in every mode; in observe an inferred accept is only recorded as one it would make. */
export const route = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(SuperagentClient, (client) => client.decision.route({ payload })));
