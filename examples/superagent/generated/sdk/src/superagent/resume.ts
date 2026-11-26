// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/superagent/resume.ts";
import { SuperagentClient, call, type CallOptions } from "../client.ts";

/** Let held work go, and move every eval's deadline later by the pause's length. Only a person, through a session. */
export const resume = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(SuperagentClient, (client) => client.superagent.resume({ payload })));
