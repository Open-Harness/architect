// Loading what a project declares, by path, so every declaration is the same object the journeys import.
import { existsSync, readdirSync, realpathSync } from "node:fs";
import { createRequire } from "node:module";
import { join, relative, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { Effect } from "effect";
import type { Journey, Operation, Read, StartingWorld, Thing } from "orthograph";
import { pluginFolder, type Model } from "@orthograph/compiler";
import { ProjectFailed, type Project } from "../types.ts";

const importFile = (path: string) =>
  Effect.tryPromise({
    try: () => import(pathToFileURL(path).href) as Promise<Record<string, unknown>>,
    catch: (e) => new ProjectFailed({ message: `${path} couldn't be loaded: ${String(e)}` }),
  });

const kindOf = (x: unknown) => (typeof x === "object" && x !== null ? (x as { kind?: unknown }).kind : undefined);

const filesIn = (dir: string, ext = ".ts") => (existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(ext) && !f.endsWith(".d.ts")).sort().map((f) => join(dir, f)) : []);

/** A declaration's file: the project's own by path, a plugin's by its specifier, resolved as the project resolves it. */
const fileOf = (root: string, file: string) => (file.startsWith("blueprint/") ? join(root, file) : createRequire(join(root, "package.json")).resolve(file));

export const loadProject = (given: string, model: Model): Effect.Effect<Project, ProjectFailed> =>
  Effect.gen(function* () {
    // By its real path, as the compiler loads it, so a declaration here is the same object the model was built from.
    const root = existsSync(given) ? realpathSync(given) : given;
    // The generated api names every event and error, the same way the server does.
    yield* importFile(join(root, "generated/api/src/index.ts"));
    const operations = new Map<string, Operation | Read>();
    for (const op of Object.values(model.operations)) {
      operations.set(op.name, (yield* importFile(fileOf(root, op.file)))["default"] as Operation | Read);
    }
    const things = new Map<string, Thing>();
    for (const t of Object.values(model.things)) {
      const module = yield* importFile(t.from.kind !== "app" ? fileOf(root, `${t.from.package}/blueprint/things/${t.from.thing}/thing.js`) : join(root, "blueprint/things", t.name, "thing.ts"));
      const thing = Object.values(module).find((x) => kindOf(x) === "thing") as Thing | undefined;
      if (thing) things.set(t.name, thing);
    }
    const journeys: Array<Journey> = [];
    const journeyFiles: Array<string> = [];
    // A journey with blanks (a stub from `ortho add journeys`) isn't run: prove names it, and `ortho check` names its blanks (K16 e).
    const unfinished: Array<string> = [];
    // The docs' place is blueprint/journeys/; a journey written at the project's root journeys/ is read too (D2 #24).
    // A feature's own journeys run beside the app's, in the app's worlds (M1-plugins section 10).
    const features = Object.values(model.mounts ?? {}).filter((m) => m.kind === "feature");
    const plugins = features.flatMap((m) => {
      const folder = pluginFolder(root, m.package);
      return folder ? filesIn(join(folder, "journeys"), ".js").map((file) => [file, `${m.package}/blueprint/${relative(folder, file).split(sep).join("/")}`] as const) : [];
    });
    const app = [...filesIn(join(root, "blueprint/journeys")), ...filesIn(join(root, "journeys"))];
    for (const [file, name] of [...app.map((f) => [f, relative(root, f).split(sep).join("/")] as const), ...plugins]) {
      const d = (yield* importFile(file))["default"];
      if (kindOf(d) !== "journey") return yield* new ProjectFailed({ message: `${file}: the default export must be a Blueprint.journey` });
      if (model.journeys[name]?.blanks) { unfinished.push(name); continue; }
      journeys.push(d as Journey);
      journeyFiles.push(name);
    }
    // A journey's step that runs an operation a mount omits is skipped and named when it runs (M1-plugins section 3).
    const omitted = yield* omittedBy(root, model);
    // Each adapter's mount by its name: the same objects the declarations name in a `service` role.
    const mounts = new Map<unknown, string>();
    for (const [name, m] of Object.entries(model.mounts ?? {})) {
      if (m.kind === "adapter") mounts.set((yield* importFile(fileOf(root, m.file)))["default"], name);
    }
    const startingWorlds = new Map<string, StartingWorld>();
    for (const file of filesIn(join(root, "blueprint/starting-worlds"))) {
      const d = (yield* importFile(file))["default"];
      if (kindOf(d) !== "starting-world") return yield* new ProjectFailed({ message: `${file}: the default export must be a Blueprint.startingWorld` });
      startingWorlds.set((d as StartingWorld).name, d as StartingWorld);
    }
    return { root: given, model, operations, things, journeys, journeyFiles, startingWorlds, ...(mounts.size > 0 ? { mounts } : {}), ...(omitted.size > 0 ? { omitted } : {}), ...(unfinished.length > 0 ? { unfinished } : {}) } satisfies Project;
  });

/** Each operation a mount omits, by its declaration: the plugin's own file, found from the operation's final name. */
const omittedBy = (root: string, model: Model) =>
  Effect.gen(function* () {
    const found = new Map<unknown, { readonly operation: string; readonly file: string }>();
    for (const [mount, m] of Object.entries(model.mounts ?? {})) {
      const own = m.package.slice(m.package.lastIndexOf("/") + 1);
      for (const operation of m.omitted ?? []) {
        const [thing = "", verb = ""] = operation.split(".");
        const theirs = mount === own ? thing : thing.slice(mount.length + 1);
        const module = yield* importFile(fileOf(root, `${m.package}/blueprint/things/${theirs}/verbs/${verb}.js`));
        found.set(module["default"], { operation, file: m.file });
      }
    }
    return found;
  });
