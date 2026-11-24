import { Effect } from "effect";
import { Records, Store, type Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/trigger/verbs/reevaluate.ts";
import { Eval } from "../../blueprint/things/eval/thing.ts";
import { Trigger } from "../../blueprint/things/trigger/thing.ts";
import { all } from "../eval/due.ts";

/**
 * Ask the main agent to judge a trigger again. An eval the main agent let run out of time is unavailable and keeps covering its triggers,
 * so none is judged twice behind a person's back (#935); this takes the one trigger out of each unavailable eval that holds it, and the
 * next pass of `eval.due` batches it with whatever else waits on its thread. The eval's other triggers stay where they are: a person
 * judges a trigger, not an eval. A trigger no unavailable eval holds is left as it is.
 */
const reevaluate: Handler<typeof declaration, Records | Store> = ({ trigger }, { steps }) =>
  Effect.gen(function* () {
    const records = yield* Records;
    const found = yield* records.find(Trigger, trigger);
    if (found === undefined) return {};
    const holding = (yield* all(found["superagent"], Eval, "oldest")).filter((e) => e.state === "unavailable" && (e["triggers"] as ReadonlyArray<string>).includes(trigger));
    yield* steps.release(Effect.forEach(holding, (listed) =>
      // Read again through the call's records, so the write is guarded by the version it was decided on.
      Effect.flatMap(records.find(Eval, String(listed["id"])), (e) =>
        e === undefined ? Effect.void : records.update(Eval, String(e["id"]), { triggers: (e["triggers"] as ReadonlyArray<string>).filter((t) => t !== trigger) }))));
    return {};
  });

export default reevaluate;
