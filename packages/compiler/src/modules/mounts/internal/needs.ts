// A plugin's needs, met by the app's mount of each needed descriptor (identity), whatever the mount is named.
import { Mounts as Picks } from "orthograph/server";
import type { Mount, Need, Option } from "orthograph";
import type { PluginPackage } from "#modules/source/types.js";

export interface Matched {
  readonly name: string;
  readonly kind: string;
  readonly file: string;
  readonly mount: Mount;
  readonly plugin: PluginPackage;
}

const kindOf = (x: unknown) => (typeof x === "object" && x !== null ? (x as { kind?: unknown }).kind : undefined);

/** The mounts meeting this mount's needs (`feature:echo`), and the needs nothing meets, each naming the command to mount it. */
export const needsOf = (me: Matched, matched: ReadonlyArray<Matched>, installed: ReadonlyArray<PluginPackage>) => {
  const met: Array<string> = [];
  const problems: Array<string> = [];
  const needs = ((me.mount.plugin as { readonly needs?: ReadonlyArray<Need> }).needs ?? []);
  for (const need of needs) {
    const conditional = kindOf(need) === "need" ? (need as { readonly plugin: unknown; readonly when?: Option }) : undefined;
    const wanted = conditional ? conditional.plugin : need;
    if (conditional?.when && !Picks.picked(me.mount, conditional.when)) continue;
    const by = matched.find((m) => m.mount.plugin === wanted);
    if (by) { met.push(`${by.kind}:${by.name}`); continue; }
    const pkg = installed.find((p) => p.descriptor === wanted);
    const kind = String(kindOf(wanted) ?? "feature");
    problems.push(pkg
      ? `${me.file}: ${me.plugin.name} needs ${pkg.name}, which isn't mounted: ortho add ${kind} ${pkg.name}`
      : `${me.file}: ${me.plugin.name} needs a ${kind} that isn't installed: install the package it names and mount it with ortho add ${kind} <package>`);
  }
  return { needs: [...new Set(met)].sort(), problems };
};
