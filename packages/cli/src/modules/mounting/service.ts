import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { Effect } from "effect";
import { packageDir, resolveFrom } from "@orthograph/compiler";
import { MountRefused, type MountingApi } from "./types.ts";
import { firstPicks, mountFile } from "./internal/scaffold.ts";
import { THREE_DAYS_MS, ageOf, excluded, fromRegistry, type Fetch } from "./internal/age.ts";
import { needLines } from "./internal/needs.ts";

const NAME = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const FOLDERS = { feature: "features", adapter: "adapters", projection: "projections" } as const;
const refuse = (message: string) => Effect.fail(new MountRefused({ message }));
const an = (kind: string) => (/^[aeiou]/.test(kind) ? `an ${kind}` : `a ${kind}`);

interface Manifest {
  readonly version?: string;
  readonly orthograph?: { readonly kind?: string };
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}
const readJson = (file: string) => JSON.parse(readFileSync(file, "utf8")) as Manifest;

/** A registry's JSON over HTTP, for R1's publish time. */
export const httpJson: Fetch = (url) =>
  Effect.tryPromise({ try: () => fetch(url).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`${r.status}`)))), catch: (e) => `${url}: ${String(e)}` });

/** `add`, reading registry release times through `fetchJson`. */
export const mountingWith = (fetchJson: Fetch): MountingApi => ({
    add: ({ root, kind, pkg, as, dryRun, registry }) =>
      Effect.gen(function* () {
        const name = as ?? pkg.slice(pkg.lastIndexOf("/") + 1);
        if (!NAME.test(name)) return yield* refuse(`"${name}" isn't a mount name: lowercase words joined by dashes, like ${pkg.slice(pkg.lastIndexOf("/") + 1)}; nothing was written`);
        const dir = packageDir(root, pkg);
        if (!dir) return yield* refuse(`${pkg} isn't installed: pnpm add --save-exact ${pkg}, then run this again; nothing was written`);
        const installed = readJson(join(dir, "package.json"));
        const version = installed.version ?? "0.0.0";
        const actual = installed.orthograph?.kind;
        if (!installed.orthograph) return yield* refuse(`${pkg} is not a plugin: its package.json has no "orthograph" key; nothing was written`);
        if (actual !== kind) return yield* refuse(`${pkg} is ${an(actual ?? "unknown kind")}, not ${an(kind)}: ortho add ${actual} ${pkg}; nothing was written`);
        const file = `blueprint/${FOLDERS[kind]}/${name}.ts`;
        if (existsSync(join(root, file))) return yield* refuse(`${file} already exists, so nothing was written: it is yours, edit it, or mount with --as <another name>`);

        const descriptor = (yield* Effect.tryPromise({ try: () => import(resolveFrom(root, pkg)) as Promise<Record<string, unknown>>, catch: (e) => new MountRefused({ message: `${pkg}: its root export can't be loaded: ${String(e)}` }) }))["default"];
        const registered = fromRegistry(root, pkg, version);
        let aged = "local: no registry release to age";
        if (registered) {
          const age = yield* ageOf(fetchJson, registry, pkg, version).pipe(Effect.mapError((why) => new MountRefused({ message: `${pkg} ${version}: R1 needs its publish time, and ${why}` })));
          if (age < THREE_DAYS_MS && !excluded(root).includes(pkg)) {
            return yield* refuse(`${pkg} ${version} was published ${Math.floor(age / 3_600_000)} hours ago, under R1's three days: wait, or name it in minimumReleaseAgeExclude with its reason`);
          }
          aged = `published ${Math.floor(age / 86_400_000)} days ago`;
        }
        const needs = yield* needLines(root, descriptor);
        const content = mountFile(pkg, version, firstPicks((descriptor as { readonly choices?: unknown } | undefined)?.choices));
        if (dryRun) return { lines: [`would write ${file}`, `would pin ${pkg} ${version} (${aged})`, ...needs, "(dry run: nothing written)"] };

        yield* Effect.sync(() => {
          mkdirSync(dirname(join(root, file)), { recursive: true });
          writeFileSync(join(root, file), content);
          // Pinned exactly where the project lists it, or as a dependency when it doesn't.
          const manifest = readJson(join(root, "package.json"));
          if (manifest.devDependencies && pkg in manifest.devDependencies) manifest.devDependencies[pkg] = version;
          else manifest.dependencies = { ...manifest.dependencies, [pkg]: version };
          writeFileSync(join(root, "package.json"), JSON.stringify(manifest, null, 2) + "\n");
        });
        return { lines: [`wrote ${file}`, `pinned ${pkg} ${version} (${aged})`, ...needs, "next ortho generate, then ortho check"] };
      }),
});

export const Mounting: MountingApi = mountingWith(httpJson);
