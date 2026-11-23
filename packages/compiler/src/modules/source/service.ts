import { createHash } from "node:crypto";
import { readFileSync, existsSync, readdirSync, realpathSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { Effect, Layer } from "effect";
import { BlueprintSource, SourceError, type LoadedFile, type PluginPackage } from "./types.ts";
import { blueprintFilesOf, dependenciesOf, integrityOf, packageDir, readManifest, resolveFrom } from "./internal/plugins.ts";

const walk = (dir: string): Array<string> =>
  readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : full.endsWith(".ts") && !full.endsWith(".d.ts") ? [full] : [];
  });

const importing = (url: string, what: string) =>
  Effect.tryPromise({
    try: () => import(url) as Promise<Record<string, unknown>>,
    catch: (e) => new SourceError({ message: `can't load ${what}: ${String(e)}` }),
  });

/** The blueprint as it is on disk, loaded with Node's own module loader; plugins as the project resolves them. */
export const nodeSource = (given: string) => {
  // By its real path: a module loader that resolves imports to real paths (Vite's does) would otherwise load a file
  // twice, once under a symlinked path such as macOS's /var and once under /private/var, and identity would break.
  const projectRoot = existsSync(given) ? realpathSync(given) : given;
  const root = join(projectRoot, "blueprint");
  const sync = <A>(what: string, f: () => A) => Effect.try({ try: f, catch: (e) => new SourceError({ message: `${what}: ${String(e)}` }) });

  const loadFile = (path: string, file: string, label: string) => importing(pathToFileURL(file).href, label).pipe(
    Effect.flatMap((exports): Effect.Effect<LoadedFile, SourceError> => /(?:^|\/)(?:journeys|starting-worlds)\//.test(path)
      ? sync(`can't hash ${label}`, () => ({ path, exports, sourceHash: createHash("sha256").update(readFileSync(file)).digest("hex") }))
      : Effect.succeed({ path, exports })),
  );

  const plugin = (name: string): Effect.Effect<PluginPackage | undefined, SourceError> => Effect.gen(function* () {
    const dir = packageDir(projectRoot, name);
    // Installed but with no package.json: it may be the plugin a mount imports, so it is named, never passed over.
    if (!dir) return existsSync(join(projectRoot, "node_modules", name))
      ? { name, version: "", kind: "", descriptor: undefined, problem: `${name}: is installed with no package.json, so it can't be read as a plugin: reinstall it` }
      : undefined;
    const manifest = yield* sync(`can't read ${name}'s package.json`, () => readManifest(join(dir, "package.json")));
    if (!manifest.orthograph) return undefined;
    const known = { name, version: manifest.version ?? "0.0.0", kind: manifest.orthograph.kind ?? "" };
    const loaded = yield* Effect.result(Effect.flatMap(sync(`can't resolve ${name}`, () => resolveFrom(projectRoot, name)), (url) => importing(url, name)));
    return loaded._tag === "Success"
      ? { ...known, descriptor: loaded.success["default"], descriptors: Object.fromEntries(Object.entries(loaded.success).filter(([, v]) => ["feature", "adapter", "projection"].includes(String((v as { readonly kind?: unknown } | null)?.kind)))) }
      : { ...known, descriptor: undefined, problem: `${name}: its root export can't be loaded (${loaded.failure.message})` };
  });

  const journeys = join(projectRoot, "journeys");
  return Layer.succeed(BlueprintSource, {
    list: sync(`can't list ${root}`, () => [
      ...walk(root).map((f) => relative(root, f).split(sep).join("/")),
      ...(existsSync(journeys) ? readdirSync(journeys, { withFileTypes: true })
        .filter((f) => f.isFile() && f.name.endsWith(".ts") && !f.name.endsWith(".d.ts"))
        .map((f) => `../journeys/${f.name}`) : []),
    ].sort()),
    load: (path) => loadFile(path, join(root, path), path.startsWith("../") ? path.slice(3) : `blueprint/${path}`),
    plugins: Effect.gen(function* () {
      const manifest = yield* sync("can't read the project's package.json", () => readManifest(join(projectRoot, "package.json")));
      const found = yield* Effect.forEach(dependenciesOf(manifest), plugin);
      return found.filter((p): p is PluginPackage => p !== undefined);
    }),
    pluginFiles: (name) => Effect.gen(function* () {
      const dir = packageDir(projectRoot, name);
      if (!dir) return yield* new SourceError({ message: `${name}: isn't installed` });
      const manifest = readManifest(join(dir, "package.json")).orthograph;
      const declared = manifest?.blueprint;
      // A projection brings no declarations and owns no operations to stale: its mount's hash holds its identity (its
      // package.json), not its sources. What it writes is guarded by drift (`ortho check`), not by the mount's hash (M1.11).
      if (manifest?.kind === "projection" && declared === undefined) return { integrity: yield* sync(`can't read ${name}`, () => integrityOf(dir, ["package.json"])), files: [] };
      const folder = declared ? join(dir, declared) : undefined;
      if (!folder || !existsSync(folder)) {
        return yield* new SourceError({ message: `${name}: its package.json declares no blueprint folder that exists (orthograph.blueprint is ${JSON.stringify(declared ?? null)})` });
      }
      const integrity = yield* sync(`can't read ${name}`, () => integrityOf(dir));
      const files = yield* Effect.forEach(blueprintFilesOf(folder), (path) =>
        loadFile(path, join(folder, path), `${name}/blueprint/${path}`).pipe(
          Effect.map((loaded) => ({ ...loaded, specifier: `${name}/blueprint/${path}` }))));
      return { integrity, layer: manifest?.src !== undefined && existsSync(join(dir, manifest.src, "layer.js")), files };
    }),
  });
};

/** Where the project has a package installed, and a plugin's blueprint folder: for the loaders that run journeys. */
export { packageDir, pluginFolder, resolveFrom } from "./internal/plugins.ts";
