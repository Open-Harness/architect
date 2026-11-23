import { Effect } from "effect";
import type { Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/decision/verbs/route.ts";

/**
 * Route an eval's items: one to twenty, each accept, attach, stop or ignore. An explicit request makes its ticket in every mode; in observe an
 * inferred accept is only recorded as one it would make. The Decision is made `recorded`, with its items as the main agent gave them
 * (`{ action, trigger, title? }`, GOAL17-stage-one call 11); `DecisionRecorded` then drives the tickets each accept makes, and slice 9 marks "would accept".
 */
const route: Handler<typeof declaration> = (_payload, { id, move }) => Effect.as(move(), { decision: id as NonNullable<typeof id> });

export default route;
