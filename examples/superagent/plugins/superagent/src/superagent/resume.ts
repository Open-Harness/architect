import { Clock, Effect } from "effect";
import { Records, type Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/superagent/verbs/resume.ts";
import { Superagent } from "../../blueprint/things/superagent/thing.ts";

/**
 * Let held work go: back to the state it was paused from, and the length of the pause is added to `pausedFor`, which every eval's deadline
 * moves later by. `pausedAt` is the last pause's moment and is read only while the superagent is paused.
 */
const resume: Handler<typeof declaration, Records> = ({ superagent }, { subject, move }) =>
  Effect.gen(function* () {
    const records = yield* Records;
    const to = subject?.["pausedFrom"] === "live" ? "live" : "observing";
    const at = BigInt(yield* Clock.currentTimeMillis);
    const since = (subject?.["pausedAt"] as bigint | undefined) ?? at;
    const length = at > since ? at - since : 0n;
    yield* records.update(Superagent, superagent, { pausedFor: ((subject?.["pausedFor"] as bigint | undefined) ?? 0n) + length });
    yield* move(to);
    return { to, at, length };
  });

export default resume;
