// The generated Worker's wrangler config, read and derived (K19). `generated/server/wrangler.jsonc` is the project's and is never edited
// by a run; a world, a build or an environment runs a config derived from it, which is where the portal's static files are added.

export interface ServerConfigApi {
  /** Wrangler's config is JSONC: the comments taken out, every string left alone, and the rest parsed. */
  readonly parse: (text: string) => unknown;
  /**
   * The portal's built client for a project: `dist/client` of the `@orthograph/portal` its `package.json` resolves, when that has been
   * built (it is built once, in this repository, with the licence). `undefined` when it is not there: the Worker then has no portal pages
   * and says so, and nothing fails.
   */
  readonly clientOf: (root: string) => string | undefined;
  /**
   * The generated config as a world or a build runs it from another folder: `main` and each migrations folder as absolute paths, and, when
   * there is a client, its folder as the Worker's static assets, bound as `PORTAL_ASSETS`, with the Worker answering first (it routes
   * `/portal`, serves the files itself and falls back to the shell for a route).
   */
  /** `main` names the entry file under `generated/server/` the config runs, in place of the one it says (a world runs `world.ts`, which registers its probes). */
  readonly derive: (root: string, baseText: string, client: string | undefined, main?: string) => string;
  /** The `assets` block of a config for a folder of the portal's client: what a world, a build and an environment all write, from here alone. */
  readonly assets: (directory: string) => { readonly directory: string; readonly binding: string; readonly run_worker_first: true };
}
