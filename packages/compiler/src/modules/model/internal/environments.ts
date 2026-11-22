// Reads the environments into the model: the name comes from the file, never from a string inside it.
import { Duration, Option } from "effect";
import type { Publication, Sink } from "orthograph";
import type { EnvironmentModel, PublicationModel, SinkModel } from "../types.ts";
import { Times } from "#modules/time/service.js";
import { hashOf } from "./hash.ts";
import type { Layout } from "./layout.ts";

const SECRET = /^[A-Z][A-Z0-9_]*$/;
const byKey = <V>(entries: ReadonlyArray<readonly [string, V]>) => [...entries].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

const GROUP = /^[A-Za-z0-9][A-Za-z0-9_.-]*$/;

const sinkOf = (s: Sink): SinkModel => (s.which === "local" ? { sink: "local" } : { sink: "axiom", group: s.group });

const publication =(p: Publication): PublicationModel =>
  p.how === "npm" ? { how: "npm", tag: p.tag } : p.how === "homebrew" ? { how: "homebrew", tap: p.tap } : { how: "binaries", on: p.on };

export const environmentsOf = (layout: Layout, problems: Array<string>): Readonly<Record<string, EnvironmentModel>> =>
  Object.fromEntries(byKey([...layout.environments]).map(([name, { file, declaration: e }]) => {
    const lifetime = e.lifetime === undefined ? Option.none() : Duration.fromInput(e.lifetime);
    if (e.lifetime !== undefined && Option.isNone(lifetime)) problems.push(`${file}: lifetime isn't a duration`);
    if (e.promotesFrom !== undefined && (e.promotesFrom === name || !layout.environments.has(e.promotesFrom))) {
      problems.push(`${file}: promotesFrom "${e.promotesFrom}" isn't another environment in blueprint/environments/`);
    }
    for (const secret of Object.keys(e.secrets ?? {})) if (!SECRET.test(secret)) problems.push(`${file}: secret "${secret}" must be UPPER_SNAKE_CASE`);
    if ((e.deploy !== undefined || e.publish !== undefined) && e.cloud === undefined) problems.push(`${file}: deploys or publishes, so it needs a cloud`);
    for (const bound of Object.keys(e.stores ?? {})) {
      const declared = layout.stores.get(bound);
      if (!declared) problems.push(`${file}: stores binds "${bound}", which isn't a declared store (${layout.stores.size > 0 ? `the stores are ${[...layout.stores.keys()].join(", ")}` : "the blueprint declares none"})`);
      else if (declared.store.of !== "database") problems.push(`${file}: stores binds "${bound}", a ${declared.store.of} store, to a database: only a database store is bound this way`);
    }
    const sinks = e.telemetry ?? [];
    for (const s of sinks) if (s.which === "axiom" && !GROUP.test(s.group)) problems.push(`${file}: the Axiom group "${s.group}" isn't a dataset group name (letters, digits, - _ .)`);
    const named = sinks.map((s) => JSON.stringify(sinkOf(s)));
    if (new Set(named).size !== named.length) problems.push(`${file}: telemetry names the same sink twice`);
    const clock = e.clock === undefined ? undefined : Times.clock({ file, clock: e.clock });
    problems.push(...(clock?.problems ?? []));
    const entry = {
      name, file, runs: e.runs, identity: e.identity.which,
      ...(clock?.clock === undefined ? {} : { clock: clock.clock }),
      lifetimeMs: Option.isSome(lifetime) ? Duration.toMillis(lifetime.value) : null,
      cloud: e.cloud ? { provider: e.cloud.provider, database: e.cloud.database.which } : null,
      database: e.database?.which ?? null,
      ...(e.stores && Object.keys(e.stores).length > 0 ? { stores: Object.fromEntries(byKey(Object.entries(e.stores)).map(([k, d]) => [k, d.which])) } : {}),
      secrets: Object.fromEntries(byKey(Object.entries(e.secrets ?? {})).map(([k, s]) => [k, s.how])),
      promotesFrom: e.promotesFrom ?? null,
      ...(e.telemetry === undefined ? {} : { telemetry: sinks.map(sinkOf) }),
      deploy: Object.fromEntries(byKey(Object.entries(e.deploy ?? {})).map(([k, d]) => [k, { how: d.how, domain: d.domain }])),
      publish: Object.fromEntries(byKey(Object.entries(e.publish ?? {})).map(([k, p]) => [k, (Array.isArray(p) ? p : [p]).map(publication)])),
    };
    return [name, { ...entry, hash: hashOf(entry) }];
  }));
