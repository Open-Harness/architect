import { Effect } from "effect";
import { BlueprintSource, type PluginPackage } from "#modules/source/types.js";
import { readLayout, type Layout, type StoreFile, type ThingFiles } from "#modules/model/internal/layout.js";
import { hashOf } from "#modules/model/internal/hash.js";
import type { BroughtAgent, BroughtSource, CallReach, MountModel, MountsApi } from "./types.ts";
import { chosenOf, choicesIn } from "./internal/choices.ts";
import { callsOf } from "./internal/calls.ts";
import { renamed, renamedStores } from "./internal/fold.ts";
import { applyVerbs } from "./internal/verbs.ts";
import { needsOf, type Matched } from "./internal/needs.ts";
import { attributed } from "./internal/attribute.ts";

const byName = <V>(m: ReadonlyMap<string, V>) => [...m].sort(([a], [b]) => a.localeCompare(b));

/** Each mount matched to the installed plugin whose descriptor it imports, once, in its kind's folder. */
const match = (layout: Parameters<MountsApi["fold"]>[0], plugins: ReadonlyArray<PluginPackage>, problems: Array<string>) => {
  const matched: Array<Matched> = [];
  for (const [name, m] of byName(layout.mounts)) {
    const plugin = plugins.find((p) => m.mount.plugin !== undefined && (p.descriptor === m.mount.plugin || Object.values(p.descriptors ?? {}).includes(m.mount.plugin)));
    if (!plugin) {
      problems.push(`${m.file}: mounts a ${m.mount.plugin?.kind ?? "plugin"} that no installed dependency in package.json provides: install its package with pnpm add --save-exact <package>`);
      for (const p of plugins) if (p.problem) problems.push(`${m.file}: ${p.problem}`);
      continue;
    }
    const twice = matched.find((x) => x.mount.plugin === m.mount.plugin);
    if (twice) { problems.push(`${twice.file} and ${m.file} both mount ${plugin.name}: a plugin is mounted once`); continue; }
    if (plugin.kind !== m.kind || m.mount.plugin.kind !== m.kind) {
      problems.push(`${m.file}: ${plugin.name} is a ${plugin.kind}, so its mount goes in blueprint/${plugin.kind}s/, not with the ${m.kind}s`);
      continue;
    }
    matched.push({ name, kind: m.kind, file: m.file, mount: m.mount, plugin });
  }
  return matched;
};

/** What an adapter declared to stand in for its outside system, as the model records it. */
const standInOf = (descriptor: unknown): MountModel["standIn"] => {
  const stand = (descriptor as { readonly standIn?: { readonly how?: string; readonly what?: string } }).standIn;
  return stand?.how === "process" || stand?.how === "vendor" ? { how: stand.how, ...(stand.what === undefined ? {} : { what: stand.what }) } : stand?.how === "none" ? { how: "none" } : undefined;
};

export const Mounts: MountsApi = {
  fold: (layout) => Effect.gen(function* () {
    if (layout.mounts.size === 0) return { things: new Map(), stores: new Map(), journeys: new Map(), mounts: {}, calls: new Map(), agents: new Map(), sources: new Map(), problems: [] };
    const source = yield* BlueprintSource;
    const problems: Array<string> = [];
    const plugins = yield* source.plugins.pipe(Effect.catch((e) => Effect.sync(() => { problems.push(e.message); return [] as ReadonlyArray<PluginPackage>; })));
    const matched = match(layout, plugins, problems);
    const things = new Map<string, ThingFiles>();
    const calls = new Map<unknown, CallReach>();
    const journeys: Layout["journeys"] = new Map();
    const stores = new Map<string, StoreFile>();
    const agents = new Map<string, BroughtAgent>();
    const sources = new Map<string, BroughtSource>();
    const extensions: Array<{ readonly file: string; readonly plugin: string; readonly t: ThingFiles }> = [];
    const brought = new Map<string, Matched>();
    const mounts: Record<string, MountModel> = {};

    for (const me of matched) {
      const { name, file, mount, plugin } = me;
      const { chosen, problems: picks } = chosenOf(file, plugin.name, mount, choicesIn(mount.plugin.choices), plugins);
      problems.push(...picks);
      const files = yield* source.pluginFiles(plugin.name).pipe(Effect.result);
      if (files._tag === "Failure") { problems.push(`${file}: ${files.failure.message}`); continue; }
      let verbs: Pick<MountModel, "omitted" | "narrowed" | "calls" | "events" | "layer" | "standIn"> = {};
      if (me.kind === "feature" || me.kind === "adapter") {
        // An adapter adds no operations, but its errors are declared in its things, which the model names like a feature's.
        const own = readLayout(files.success.files.filter((f) => f.path.startsWith("things/") || (me.kind === "feature" && (f.path.startsWith("journeys/") || f.path.startsWith("stores/") || f.path.startsWith("agents/") || f.path.startsWith("sources/")))), (path) => `${plugin.name}/blueprint/${path}`);
        // A folder of verbs and no thing.ts adds operations to a thing another plugin (or the app) brings: not a thing of its own.
        const added = [...own.things.values()].filter((t) => !t.thing).map((t) => t.name);
        problems.push(...own.problems.filter((p) => !added.some((n) => p === `${plugin.name}/blueprint/things/${n}: has no thing.ts`)));
        for (const [path, journey] of own.journeys) journeys.set(path, journey);
        for (const [n, a] of own.agents) {
          if (agents.has(n)) problems.push(`${file}: ${plugin.name} brings agent ${n} (${a.file}), and ${agents.get(n)!.mount} brings one by that name`);
          else agents.set(n, { ...a, file: `blueprint/agents/${n}.ts`, mount: name });
        }
        for (const [n, s] of own.sources) {
          if (sources.has(n)) problems.push(`${file}: ${plugin.name} brings source ${n} (${s.file}), and ${sources.get(n)!.file} brings one by that name: a source is named by its file`);
          else sources.set(n, { ...s, mount: name, package: plugin.name });
        }
        // Each thing gets its own verbs map, so an omit changes only this mount's copy.
        const mine = renamed(own, name, plugin.name, plugin.version).map((t) => ({ ...t, verbs: new Map(t.verbs) }));
        const applied = applyVerbs(file, plugin.name, mount, mine, layout);
        problems.push(...applied.problems);
        for (const s of renamedStores(own, name, plugin.name, plugin.version)) {
          const app = layout.stores.get(s.name);
          const other = stores.get(s.name);
          if (app) problems.push(`${file}: ${plugin.name} brings store ${s.name}, and the blueprint has one by that name, ${app.file}: mount it under another name`);
          else if (other) problems.push(`${file}: ${plugin.name} brings store ${s.name}, and ${other.file} brings one by that name: mount one under another name`);
          else stores.set(s.name, s);
        }
        verbs = { ...(applied.omitted.length > 0 ? { omitted: applied.omitted } : {}), ...(Object.keys(applied.narrowed).length > 0 ? { narrowed: applied.narrowed } : {}) };
        for (const t of mine.filter((x) => !x.thing)) extensions.push({ file, plugin: plugin.name, t });
        for (const t of mine.filter((x) => x.thing)) {
          const app = layout.things.get(t.name);
          const other = brought.get(t.name);
          // An app folder with verbs and no thing.ts adds operations to the plugin's thing; it is not a second thing.
          if (app?.thing) problems.push(`${file}: ${plugin.name} brings thing ${t.name} (${t.base}), and the blueprint has one by that name, ${app.base}: mount it under another name`);
          else if (other) problems.push(`${file}: ${plugin.name} brings thing ${t.name} (${t.base}), and ${other.file} brings one by that name from ${other.plugin.name}: mount one under another name`);
          else { things.set(t.name, t); brought.set(t.name, me); }
        }
      }
      if (me.kind === "adapter") {
        const reached = callsOf(file, plugin.name, name, mount);
        problems.push(...reached.problems);
        for (const [call, reach] of reached.reach) calls.set(call, reach);
        const stand = standInOf(mount.plugin);
        verbs = { ...verbs, ...(reached.included.length > 0 ? { calls: reached.included } : {}), ...(reached.events.length > 0 ? { events: reached.events } : {}), ...(files.success.layer ? { layer: true as const } : {}), ...(stand ? { standIn: stand } : {}) };
      }
      const needs = needsOf(me, matched, plugins);
      problems.push(...needs.problems);
      const entry = { kind: me.kind as MountModel["kind"], file, package: plugin.name, version: plugin.version, integrity: files.success.integrity, chosen, ...verbs, ...(needs.needs.length > 0 ? { needs: needs.needs } : {}) };
      mounts[name] = { ...entry, hash: hashOf({ ...entry, file: undefined }) };
    }
    // Each such folder joins its thing; its operations are the plugin's that wrote them.
    for (const { file, plugin, t } of extensions) {
      const target = things.get(t.name) ?? layout.things.get(t.name);
      if (!target?.thing) { problems.push(`${file}: ${plugin} adds operations to thing ${t.name}, which no mounted plugin or the app brings`); continue; }
      for (const [verb, v] of t.verbs) {
        const taken = target.verbs.get(verb);
        // One operation has one declaration: an added verb may not be one the thing already has, nor one another folder adds.
        if (taken) problems.push(`${file}: ${plugin} adds ${t.name}.${verb} (${v.file}), which ${t.name} already has (${taken.file}): name the operation another verb`);
        else target.verbs.set(verb, { ...v, from: t.from });
      }
    }
    return { things, stores, journeys, mounts, calls, agents, sources, problems };
  }),
  attributed,
};
