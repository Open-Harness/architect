// The Nx sync generator: `nx sync` writes, `nx sync:check` fails on drift. Registered in nx.json `sync.globalGenerators`.
import { getProjects, type Tree } from "@nx/devkit";
import { Effect } from "effect";
import { Sync } from "#modules/sync/service.js";

export default async function sync(tree: Tree) {
  // An app's blueprint is generated here; a plugin's (its package.json declares `orthograph.kind`) is not an app's, and is
  // judged where an app mounts it.
  const plugin = (root: string) => tree.exists(`${root}/package.json`) && (JSON.parse(tree.read(`${root}/package.json`, "utf-8") ?? "{}") as { orthograph?: { kind?: string } }).orthograph?.kind !== undefined;
  const roots = [...getProjects(tree).values()].map((p) => p.root).filter((root) => tree.exists(`${root}/blueprint`) && !plugin(root));
  await Effect.runPromise(Effect.forEach(roots, (root) => Sync.project(tree, root), { discard: true }));
  const changed = tree.listChanges().map((c) => `${c.type} ${c.path}`);
  return changed.length === 0
    ? undefined
    : { outOfSyncMessage: "generated/ doesn't match the blueprint. Run nx sync.", outOfSyncDetails: changed };
}
