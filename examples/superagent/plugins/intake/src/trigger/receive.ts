import { Effect } from "effect";
import { Ids, Records, Store, type Handler } from "@orthograph/language-effect";
import { Superagent } from "@orthograph/superagent/blueprint/things/superagent/thing.ts";
import type declaration from "../../blueprint/things/trigger/verbs/receive.ts";
import { Account } from "../../blueprint/things/account/thing.ts";
import { oneAccountPerExternalId } from "../../blueprint/things/account/invariants.ts";
import { Policy } from "../../blueprint/things/policy/thing.ts";
import { Thread } from "../../blueprint/things/thread/thing.ts";
import { oneThreadPerKey } from "../../blueprint/things/thread/invariants.ts";
import { Trigger } from "../../blueprint/things/trigger/thing.ts";
import { oneTriggerPerEvent } from "../../blueprint/things/trigger/invariants.ts";
import { slackSource } from "../../blueprint/sources/slack.ts";
import { githubSource } from "../../blueprint/sources/github.ts";
import { gate } from "../modules/gate/service.ts";
import type { PolicyView, Strength, TriggerView } from "../modules/gate/types.ts";

/** The source kinds a connection names, by the name it gives them: what says, for an event, whether its source listens and which admission row it is. */
const kinds = { slack: slackSource, github: githubSource } as const;

/** The policy as it stands: the newest version, or the defaults of a superagent that has saved none (observe, no bots, every cell its default). */
const policyOf = (source: string) =>
  Effect.fnUntraced(function* (superagent: string) {
    const store = yield* Store;
    const [current] = (yield* store.list({ thing: Policy, where: { superagent }, state: undefined, order: "newest", limit: 1, after: undefined })).items;
    const bots = ((current?.["bots"] ?? []) as ReadonlyArray<string>).filter((b) => b.startsWith(`${source}:`)).map((b) => b.slice(source.length + 1));
    return { mode: (current?.["mode"] ?? "observe") as PolicyView["mode"], bots: new Set(bots), admission: (current?.["admission"] ?? {}) as PolicyView["admission"] } satisfies PolicyView;
  });

/**
 * Store one event a connection brought, once. A second delivery of the same event is a duplicate. An event the gate does not admit is
 * filtered and kept nowhere, not even the sender's account. A stored one makes its thread (if it is the first on it) and its sender's
 * account (if it is new), `seen`, in the same commit as the trigger.
 */
const receive: Handler<typeof declaration, Records | Store> = (payload, { id, move }) =>
  Effect.gen(function* () {
    const records = yield* Records;
    const { superagent, source, event, thread, actor } = payload;
    const known = yield* records.findBy(oneTriggerPerEvent, { superagent, source, event });
    if (known !== undefined) return { trigger: known["id"] as NonNullable<typeof id>, outcome: "duplicate" as const };

    // What the source's own mapping says of the event: whether it listens, whether it sees every message, and the admission row.
    const connection = (yield* records.find(Superagent, superagent))?.["connections"] as ReadonlyArray<{ readonly source: string; readonly config: unknown }> | undefined;
    const config = connection?.find((c) => c.source === source)?.config;
    const kind = (kinds as Readonly<Record<string, { readonly spec: { readonly scope: (c: never, m: never) => { readonly listened: boolean; readonly observed: boolean; readonly row: string } } | undefined }>>)[source];
    const scope = kind?.spec !== undefined && config !== undefined
      ? kind.spec.scope(config as never, { kind: payload.kind, thread, text: payload.text, channel: payload.channel, ...(payload.addressed === undefined ? {} : { addressed: payload.addressed }) } as never)
      : { listened: true, observed: false, row: source };

    const existing = actor === undefined ? undefined : yield* records.findBy(oneAccountPerExternalId, { superagent, source, external: actor.id });
    const view: TriggerView = {
      addressed: payload.addressed,
      author: actor === undefined ? null : { state: (existing?.["state"] ?? "seen") as "seen" | "listed" | "unlisted", bot: actor.bot, external: actor.id },
      row: scope.row,
      observed: scope.observed,
    };
    const policy = yield* policyOf(source)(superagent);
    // The tickets that follow a thread are the tickets plugin's to say (it depends on this one, not the other way): until a ticket writes its follow, none counts.
    const strength: Strength = scope.listened ? gate.of(view, { key: thread }, [], policy).strength : "none";
    if (strength === "none") return { outcome: "filtered" as const };

    const trigger = id as NonNullable<typeof id>;
    const existingThread = yield* records.findBy(oneThreadPerKey, { superagent, source, key: thread });
    if (existingThread === undefined) yield* records.insert(Thread, { id: yield* Ids.of(Thread.fields.id), superagent, source, key: thread, channel: payload.channel }, "idle");
    if (actor !== undefined && existing === undefined) {
      yield* records.insert(Account, { id: yield* Ids.of(Account.fields.id), superagent, source, external: actor.id, login: actor.name, bot: actor.bot }, "seen");
    }
    yield* records.insert(Trigger, {
      id: trigger, superagent, source, event, thread, kind: payload.kind, text: payload.text, channel: payload.channel,
      ...(payload.url === undefined ? {} : { url: payload.url }), ...(actor === undefined ? {} : { author: actor.id }),
    } as never);
    yield* move();
    return { trigger, outcome: "stored" as const };
  });

export default receive;
