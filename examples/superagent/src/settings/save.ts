// Scaffolded from blueprint/things/settings/verbs/save.ts. Yours from now on.
import { Clock, Effect } from "effect";
import { acting } from "orthograph";
import { Records, Store } from "@orthograph/language-effect";
import { Errors } from "../../generated/api/src/index.ts";
import type { Handler } from "../../generated/api/src/settings/save.handler.ts";
import { Settings } from "../../blueprint/things/settings/thing.ts";

const { StaleRevision } = Errors.declared;

/**
 * settings.save: the app's one Settings has no key of its own, so every save is a row and the newest is current. A save made from any
 * other version is refused with the current one; the newest row is touched in the same commit, so two saves from one base cannot both land.
 *
 * Who may call, from blueprint/things/settings/verbs/save.ts: anyone signed in. A main agent may only propose it (`proposal.propose`).
 */
const save: Handler<Records | Store> = ({ base, variables, blocked }, { principal, move, id }) =>
  Effect.gen(function* () {
    const records = yield* Records;
    const store = yield* Store;
    const [latest] = (yield* store.list({ thing: Settings, where: {}, state: undefined, order: "newest", limit: 1, after: undefined })).items;
    const current = (latest?.["revision"] as bigint | undefined) ?? 0n;
    if (base !== current) {
      yield* Effect.logInfo("the save was made from an older version").pipe(Effect.annotateLogs({ base: String(base), current: String(current) }));
      return yield* new StaleRevision({ current });
    }
    const settings = id as NonNullable<typeof id>;
    if (latest !== undefined) yield* records.update(Settings, String(latest["id"]), {});
    const at = yield* Clock.currentTimeMillis;
    yield* records.insert(Settings, { id: settings, revision: current + 1n, variables, blocked, saved: { at, by: acting(principal)?.person ?? principal.kind, from: Number(base) } } as never);
    yield* move();
    return { settings, revision: current + 1n };
  });

export default save;
