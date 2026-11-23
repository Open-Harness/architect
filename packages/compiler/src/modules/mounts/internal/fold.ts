// A feature's things and stores, renamed for the mount: a thing keeps its name when the mount's name is the plugin's own,
// else is prefixed with it; a store is always prefixed (K3 item 7).
import type { Layout, StoreFile, ThingFiles } from "#modules/model/internal/layout.js";

/** `@fixture/echo` is `echo`: the last part of its package name. */
export const ownName = (pkg: string): string => pkg.slice(pkg.lastIndexOf("/") + 1);

export const renamed = (plugin: Layout, mount: string, pkg: string, version: string): ReadonlyArray<ThingFiles> =>
  [...plugin.things.values()].map((t) => {
    const from = { kind: "feature" as const, mount, package: pkg, version, thing: t.name };
    return { ...t, name: mount === ownName(pkg) ? t.name : `${mount}-${t.name}`, from };
  });

/** A feature's own stores: the mount's name and the store's path, so two plugins never collide and the project never sees a bare one. */
export const renamedStores = (plugin: Layout, mount: string, pkg: string, version: string): ReadonlyArray<StoreFile> =>
  [...plugin.stores.values()].map((s) => ({ ...s, name: `${mount}-${s.name}`, from: { mount, package: pkg, version, store: s.name } }));
