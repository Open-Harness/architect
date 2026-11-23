// What the plugin needs at its first picks, and whether the project already mounts each (identity, as the compiler does).
import { Effect } from "effect";
import { Mounts as Picks } from "orthograph/server";
import type { Mount, Need, Option } from "orthograph";
import { BlueprintSource, nodeSource } from "@orthograph/compiler";

const kindOf = (x: unknown) => (typeof x === "object" && x !== null ? (x as { kind?: unknown }).kind : undefined);
const MOUNTS = /^(features|adapters|projections)\/[^/]+\.ts$/;

export const needLines = (root: string, descriptor: unknown) =>
  Effect.gen(function* () {
    const source = yield* BlueprintSource;
    const nothing: Pick<Mount, "verbs"> = { verbs: [] };
    const needs = ((descriptor as { readonly needs?: ReadonlyArray<Need> }).needs ?? []).flatMap((need) => {
      const when = kindOf(need) === "need" ? (need as { readonly when?: Option }).when : undefined;
      const wanted = kindOf(need) === "need" ? (need as { readonly plugin: unknown }).plugin : need;
      return when && !Picks.picked(nothing, when) ? [] : [wanted];
    });
    if (needs.length === 0) return ["needs none"];
    const installed = yield* source.plugins;
    const mounts = yield* Effect.forEach((yield* source.list).filter((p) => MOUNTS.test(p)), source.load);
    return needs.map((wanted) => {
      const pkg = installed.find((p) => p.descriptor === wanted);
      const kind = String(kindOf(wanted) ?? "feature");
      const by = mounts.find((m) => (m.exports["default"] as Partial<Mount> | undefined)?.plugin === wanted);
      const name = pkg?.name ?? `a ${kind} that isn't installed`;
      return by ? `needs ${name}: met by blueprint/${by.path}` : `needs ${name}: not mounted: ortho add ${kind} ${pkg?.name ?? "<package>"}`;
    });
  }).pipe(Effect.provide(nodeSource(root)), Effect.orElseSucceed(() => ["needs (unread: the blueprint couldn't be loaded; ortho model says why)"]));
