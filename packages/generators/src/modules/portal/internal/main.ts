import { Names } from "orthograph/server";
import type { RenderedFile } from "#modules/render/types.js";

const GENERATED = "// Generated from the blueprint. Do not edit.";

/** The host entry: the generated blueprint and the portal's server half, nothing of the project's own. The Worker's one door into the portal. */
export const renderMain = (): RenderedFile => ({
  path: "generated/portal/main.ts",
  scaffold: false,
  content: [
    GENERATED,
    "// The portal's host entry: this project's blueprint (blueprint.json, from the model and the generated docs), served by",
    `// ${Names.pkg("portal")}/server over the logbook. \`/_portal/v1/*\` is data and \`/portal\` is the prebuilt client's static files (K19);`,
    "// nothing else is the portal's, and nothing here reaches React, the portal's UI or HeroUI.",
    `import { Effect } from "effect";`,
    `import { PortalServer, type PortalEnv } from "${Names.pkg("portal")}/server";`,
    `import blueprint from "./blueprint.json" with { type: "json" };`,
    "",
    "export type { PortalEnv };",
    "export const owns: (pathname: string) => boolean = PortalServer.owns;",
    "export const serve = (request: Request, env: PortalEnv): Promise<Response> => Effect.runPromise(PortalServer.serve(blueprint, request, env));",
    "",
  ].join("\n"),
});
