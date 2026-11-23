// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/assignment/promoted.ts";
import { SuperagentClient, call, type CallOptions } from "../client.ts";

/** A person's Input on a pending Assignment moves it up: its reason becomes a person's. */
export const promoted = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(SuperagentClient, (client) => client.assignment.promoted({ payload })));
