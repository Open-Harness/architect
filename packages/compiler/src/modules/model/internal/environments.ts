// Reads the environments into the model: the name comes from the file, never from a string inside it.
import { Duration, Option } from "effect";
import type { ChainNetwork, Database, Publication, Sink } from "orthograph";
import type { EnvironmentModel, PublicationModel, SecretModel, SinkModel } from "../types.ts";
import { Times } from "#modules/time/service.js";
import { hashOf } from "./hash.ts";
import type { Layout } from "./layout.ts";

const SECRET = /^[A-Z][A-Z0-9_]*$/;
const byKey = <V>(entries: ReadonlyArray<readonly [string, V]>) => [...entries].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

const GROUP = /^[A-Za-z0-9][A-Za-z0-9_.-]*$/;

const sinkOf = (s: Sink): SinkModel => (s.which === "local" ? { sink: "local" } : { sink: "axiom", group: s.group });

const publication =(p: Publication): PublicationModel =>
  p.how === "npm" ? { how: "npm", tag: p.tag } : p.how === "homebrew" ? { how: "homebrew", tap: p.tap } : { how: "binaries", on: p.on };

/** Every runtime secret of the mounts and the app, in every environment: a release or builder secret never reaches a running place. */
const runtimeOf = (secrets: Readonly<Record<string, SecretModel>>): ReadonlyArray<readonly [string, SecretModel["how"]]> =>
  Object.entries(secrets).flatMap(([name, s]) => (s.kind === "runtime" ? [[name, s.how] as const] : []));

const ADDRESS = /^0x[0-9a-fA-F]{40}$/;

/** What an environment binds a store to: a database, or (for a chain store) a network. */
const bindingOf = (b: Database | ChainNetwork): "d1" | "d1-local" | { readonly chain: "evm"; readonly network: string } =>
  b.kind === "chain" ? { chain: b.of, network: b.network } : b.which;

/**
 * `tokens` is each chain store's fixed token assets (the ones its things count); an environment that runs the store
 * must bind each to a contract (M6-money item 2).
 */
export const environmentsOf = (layout: Layout, problems: Array<string>, tokens: ReadonlyMap<string, ReadonlySet<string>> = new Map(), secrets: Readonly<Record<string, SecretModel>> = {}): Readonly<Record<string, EnvironmentModel>> =>
  Object.fromEntries(byKey([...layout.environments]).map(([name, { file, declaration: e }]) => {
    const lifetime = e.lifetime === undefined ? Option.none() : Duration.fromInput(e.lifetime);
    if (e.lifetime !== undefined && Option.isNone(lifetime)) problems.push(`${file}: lifetime isn't a duration`);
    if (e.promotesFrom !== undefined && (e.promotesFrom === name || !layout.environments.has(e.promotesFrom))) {
      problems.push(`${file}: promotesFrom "${e.promotesFrom}" isn't another environment in blueprint/environments/`);
    }
    for (const secret of Object.keys(e.secrets ?? {})) {
      if (!SECRET.test(secret)) problems.push(`${file}: secret "${secret}" must be UPPER_SNAKE_CASE`);
      if (secrets[secret]) problems.push(`${file}: secret "${secret}" is declared by a secrets.ts, so an environment doesn't name it too`);
    }
    if ((e.deploy !== undefined || e.publish !== undefined) && e.cloud === undefined) problems.push(`${file}: deploys or publishes, so it needs a cloud`);
    for (const [bound, to] of Object.entries(e.stores ?? {})) {
      const declared = layout.stores.get(bound);
      if (!declared) problems.push(`${file}: stores binds "${bound}", which isn't a declared store (${layout.stores.size > 0 ? `the stores are ${[...layout.stores.keys()].join(", ")}` : "the blueprint declares none"})`);
      else if (declared.store.of === "chain.evm" ? to.kind !== "chain" : declared.store.of !== "database" || to.kind !== "database") {
        problems.push(declared.store.of === "chain.evm"
          ? `${file}: stores binds "${bound}", a chain.evm store, to a database: a chain store is bound to a network, as Chain.evm.network("anvil")`
          : `${file}: stores binds "${bound}", a ${declared.store.of} store, to ${to.kind === "chain" ? "a chain" : "a database"}: only a database store is bound this way`);
      }
    }
    const chains = Object.entries(e.stores ?? {}).filter(([, to]) => to.kind === "chain").map(([store]) => store);
    for (const [asset, per] of Object.entries(e.assets ?? {})) {
      if (layout.assets.get(asset)?.asset.of !== "token") problems.push(`${file}: assets binds "${asset}", which isn't a token asset in blueprint/assets/ (${[...layout.assets].filter(([, a]) => a.asset.of === "token").map(([n]) => n).join(", ") || "the blueprint declares none"})`);
      for (const [store, token] of Object.entries(per)) {
        if (layout.stores.get(store)?.store.of !== "chain.evm") problems.push(`${file}: assets binds "${asset}" for "${store}", which isn't a chain store of the blueprint`);
        if (!ADDRESS.test(token.address)) problems.push(`${file}: assets binds "${asset}" for "${store}" to "${token.address}", which isn't an EVM address (0x and 40 hex digits)`);
      }
    }
    for (const store of chains) {
      for (const asset of [...(tokens.get(store) ?? [])].sort()) {
        if (e.assets?.[asset]?.[store] === undefined) problems.push(`${file}: the environment runs the chain store ${store}, whose things count the token asset ${asset}, and doesn't bind it: add assets: { ${asset}: { ${store}: Chain.evm.token("0x…") } }`);
      }
    }
    if (e.issues !== undefined && e.issues.length === 0) problems.push(`${file}: issues names no way in: leave it out to issue every way in`);
    const sinks = e.telemetry ?? [];
    for (const s of sinks) if (s.which === "axiom" && !GROUP.test(s.group)) problems.push(`${file}: the Axiom group "${s.group}" isn't a dataset group name (letters, digits, - _ .)`);
    const named = sinks.map((s) => JSON.stringify(sinkOf(s)));
    if (new Set(named).size !== named.length) problems.push(`${file}: telemetry names the same sink twice`);
    const clock = e.clock === undefined ? undefined : Times.clock({ file, clock: e.clock });
    problems.push(...(clock?.problems ?? []));
    const entry = {
      name, file, runs: e.runs, ...(e.identity === undefined ? {} : { identity: e.identity.which }),
      ...(e.issues === undefined ? {} : { issues: [...new Set(e.issues)].sort() }),
      ...(clock?.clock === undefined ? {} : { clock: clock.clock }),
      lifetimeMs: Option.isSome(lifetime) ? Duration.toMillis(lifetime.value) : null,
      cloud: e.cloud ? { provider: e.cloud.provider, database: e.cloud.database.which } : null,
      database: e.database?.which ?? null,
      ...(e.stores && Object.keys(e.stores).length > 0 ? { stores: Object.fromEntries(byKey(Object.entries(e.stores)).map(([k, d]) => [k, bindingOf(d)])) } : {}),
      ...(e.assets && Object.keys(e.assets).length > 0 ? { assets: Object.fromEntries(byKey(Object.entries(e.assets)).map(([a, per]) => [a, Object.fromEntries(byKey(Object.entries(per)).map(([store, t]) => [store, { chain: t.of, address: t.address }]))])) } : {}),
      secrets: Object.fromEntries(byKey([...Object.entries(e.secrets ?? {}).map(([k, s]) => [k, s.how] as const), ...runtimeOf(secrets)])),
      promotesFrom: e.promotesFrom ?? null,
      ...(e.telemetry === undefined ? {} : { telemetry: sinks.map(sinkOf) }),
      deploy: Object.fromEntries(byKey(Object.entries(e.deploy ?? {})).map(([k, d]) => [k, { how: d.how, domain: d.domain }])),
      publish: Object.fromEntries(byKey(Object.entries(e.publish ?? {})).map(([k, p]) => [k, (Array.isArray(p) ? p : [p]).map(publication)])),
    };
    return [name, { ...entry, hash: hashOf(entry) }];
  }));
