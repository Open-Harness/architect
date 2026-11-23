// The projections a project mounts: each `blueprint/projections/<name>.ts` is the one thing that makes `generated/<name>/`.
import { pathToFileURL } from "node:url";
import { join } from "node:path";
import { Effect } from "effect";
import type { Projection } from "orthograph";
import type { Model } from "@orthograph/compiler";
import { api, cli, mcp, model as modelProjection, sdk, server } from "@orthograph/projections";
import { GENERATED } from "@orthograph/projections/shared";
import { RenderFailed, type RenderedFile } from "../types.ts";

export interface Mounted {
  readonly mount: string;
  readonly projection: Projection<any>;
  /** The mount's file, when there is one: what the files it makes say they were generated from. */
  readonly file?: string;
}

/**
 * What a project that mounts no projection at all gets: the model, the api, the server, the sdk, the cli and the mcp, as if it mounted them under
 * their own names, their headers as they were. A project that mounts any projection gets exactly the ones it mounts.
 */
const standing: ReadonlyArray<Mounted> = [{ mount: "model", projection: modelProjection }, { mount: "api", projection: api }, { mount: "server", projection: server }, { mount: "sdk", projection: sdk }, { mount: "cli", projection: cli }, { mount: "mcp", projection: mcp }];

/** The mount file's default export is the mount; its `plugin` is the projection the compiler matched to a package. */
const loaded = (root: string, mount: string, file: string, hash: string): Effect.Effect<Mounted, RenderFailed> =>
  Effect.tryPromise({
    try: () => import(`${pathToFileURL(join(root, file)).href}?mount=${hash}`) as Promise<{ readonly default?: { readonly plugin?: Projection<any> } }>,
    catch: (e) => new RenderFailed({ message: `${file}: can't load the mount (${String(e)})` }),
  }).pipe(Effect.flatMap((loadedFile) => {
    const projection = loadedFile.default?.plugin;
    return projection?.kind === "projection" && typeof projection.render === "function"
      ? Effect.succeed<Mounted>({ mount, projection, file })
      : Effect.fail(new RenderFailed({ message: `${file}: doesn't export a mount of a projection (export default Blueprint.use(<projection>, …))` }));
  }));

export const mountedIn = (root: string | undefined, model: Model): Effect.Effect<ReadonlyArray<Mounted>, RenderFailed> => {
  const projections = Object.entries(model.mounts ?? {}).filter(([, m]) => m.kind === "projection").sort(([a], [b]) => a.localeCompare(b));
  if (projections.length === 0) return Effect.succeed(standing);
  if (root === undefined) return Effect.fail(new RenderFailed({ message: `${projections[0]![1].file}: the model mounts projections, and no project folder was given to load them from` }));
  return Effect.forEach(projections, ([mount, m]) => loaded(root, mount, m.file, m.hash));
};

/** Each file a mounted projection renders, under `generated/<mount>/`, its first line naming the mount that made it. */
export const filesOf = (name: string, model: Model, mounted: Mounted): Effect.Effect<ReadonlyArray<RenderedFile>, RenderFailed> =>
  mounted.projection.render({ name, model, mount: mounted.mount, mounts: model.mounts ?? {} }).pipe(
    Effect.mapError((e) => new RenderFailed({ message: mounted.file === undefined ? String(e) : (e as { readonly message?: string }).message ?? `${mounted.file}: ${String(e)}` })),
    Effect.flatMap((outputs) => {
      // A projection writes under its own folder and nowhere else.
      const escaping = outputs.find((o) => o.path.startsWith("/") || o.path.split("/").includes(".."));
      return escaping
        ? Effect.fail(new RenderFailed({ message: `${mounted.file ?? mounted.mount}: writes ${escaping.path}, outside generated/${mounted.mount}/` }))
        : Effect.succeed(outputs.map((o): RenderedFile => {
          // The CLI's entry opens with a shebang: its generated line is the second.
          const [shebang, ...body] = o.content.startsWith("#!") ? o.content.split("\n") : [undefined, ...o.content.split("\n")];
          const [first = "", ...rest] = body;
          const named = mounted.file !== undefined && first === GENERATED ? [`// Generated from ${mounted.file}. Do not edit.`, ...rest] : body;
          const content = (shebang === undefined ? named : [shebang, ...named]).join("\n");
          return { path: `generated/${mounted.mount}/${o.path}`, content, scaffold: false };
        }));
    }),
  );
