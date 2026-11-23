// Sources in the model (GOAL17-source-from): each active mapping folds in with the events and calls it uses, its variables and the
// kinds it makes; the refusals bind a mapping to the mount of the adapter it maps.
import type { SourceKind } from "orthograph";
import type { MountModel } from "../types.ts";
import type { Layout } from "./layout.ts";
import { refuseSpec } from "./source-refusals.ts";

export interface SourceContext {
  readonly layout: Layout;
  readonly mounts: Readonly<Record<string, MountModel>>;
  readonly problems: Array<string>;
}

const SECRET_WORD = /_(TOKEN|KEY|SECRET|PASSWORD)$/;

/** Every string literal of every `kind:` expression in what the `on` mappings make, sorted and distinct. */
export const kindsOf = (on: Readonly<Record<string, unknown>>): ReadonlyArray<string> => {
  const found = new Set<string>();
  for (const fn of Object.values(on)) {
    for (const m of String(fn).matchAll(/\bkind\s*:\s*([^,}]*)/g)) {
      for (const lit of m[1]!.matchAll(/"([^"]*)"|'([^']*)'/g)) found.add(lit[1] ?? lit[2] ?? "");
    }
  }
  return [...found].sort();
};

const sorted = (xs: Iterable<string>) => [...new Set(xs)].sort();

export const sourcesModel = (ctx: SourceContext) => {
  const out: Record<string, unknown> = {};
  for (const [name, { file, declaration: kind, exportName }] of [...ctx.layout.sources].sort(([a], [b]) => a.localeCompare(b))) {
    if (kind.adapter === null) {
      const fields = Object.keys((kind.config as unknown as { readonly fields?: object }).fields ?? {});
      out[name] = { mount: null, config: Object.fromEntries(fields.map((f) => [f, "text"])) };
      continue;
    }
    const spec = kind.spec!;
    const adapter = kind.adapter;
    const mountEntry = [...ctx.layout.mounts].find(([, m]) => m.mount.plugin === adapter);
    if (!mountEntry) continue;
    const [mount, mountFile] = mountEntry;
    const offered = Object.keys((adapter as { readonly events?: object }).events ?? {});
    const used = sorted([...Object.keys(spec.on ?? {}), ...Object.keys(spec.closed ?? {})]);
    for (const e of used) if (!offered.includes(e)) ctx.problems.push(`${file}: ${exportName} maps the event ${e}, which ${ctx.mounts[mount]?.package ?? mount} doesn't have (its events: ${offered.join(", ") || "none"})`);
    const included = ctx.mounts[mount]?.events ?? [];
    // A source is active when its adapter is mounted and the mount includes any event it maps.
    if (!used.some((e) => included.includes(e))) continue;
    for (const e of used.filter((x) => offered.includes(x) && !included.includes(x))) {
      ctx.problems.push(`${mountFile.file}: ${mount} does not include events.${e}, which ${exportName} maps: add p.include(p.events.${e})`);
    }
    const calls = [spec.reply?.call, spec.history?.call, spec.policyPart.sync?.call].flatMap((call) => (call === undefined ? [] : [ctx.layout.calls.get(call)]));
    for (const reach of calls) {
      if (reach === undefined) ctx.problems.push(`${file}: ${exportName} uses a call that is not one of ${mount}'s calls`);
      else if (!reach.included) ctx.problems.push(`${reach.file}: ${mount} does not include calls.${reach.call}, which ${exportName} uses: add p.include(p.calls.${reach.call})`);
    }
    refuseSpec(ctx.problems, file, exportName, spec, (call) => ctx.layout.calls.get(call as never)?.call);
    const prefix = `${name.toUpperCase().replaceAll("-", "_")}_`;
    for (const v of Object.keys(spec.environment.variables)) {
      if (!/^[A-Z][A-Z0-9_]*$/.test(v)) ctx.problems.push(`${file}: variable ${v} must be capitals, digits and underscores`);
      if (SECRET_WORD.test(v)) ctx.problems.push(`${file}: variable ${v} ends in a secret's word (_TOKEN, _KEY, _SECRET, _PASSWORD): an execution variable is never a credential`);
      if (!v.startsWith(prefix)) ctx.problems.push(`${file}: variable ${v} does not start with its source's own prefix ${prefix}`);
    }
    out[name] = {
      mount, file, export: exportName, events: used, calls: sorted(calls.flatMap((c) => (c === undefined ? [] : [c.call]))),
      variables: spec.environment.variables, kinds: kindsOf(spec.on ?? {}),
    };
  }
  return out;
};

export const sourceNameOf = (layout: Layout, kind: SourceKind<any>): string | undefined =>
  [...layout.sources].find(([, s]) => s.declaration === kind)?.[0];
