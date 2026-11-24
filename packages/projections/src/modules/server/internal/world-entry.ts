// `generated/server/world.ts`: the Worker a world runs, which is the production Worker with the probes of the packages that ship them registered
// (GOAL17-check-harness, call 5). It is the only file that imports a package's `testing.ts`, and nothing imports it but a world's own wrangler config
// (prove derives that config; a deploy names `main.ts`), so no production Worker reaches a probe's handler.
import { Names } from "orthograph/server";
import type { Model } from "@orthograph/compiler";
import type { RenderedFile } from "#modules/names/types.js";
import { GENERATED, lines } from "#modules/names/service.js";

/** The packages mounted in this app that ship a `testing.ts` of probe handlers: today the agents'. */
const PROBING = ["agents"] as const;

export const renderWorldEntry = (model: Model, empty: boolean): ReadonlyArray<RenderedFile> => {
  const probing = PROBING.filter((p) => Object.values(model.mounts ?? {}).some((m) => m.package === Names.pkg(p)));
  if (probing.length === 0 || empty) return [];
  return [{
    path: "generated/server/world.ts",
    scaffold: false,
    content: lines(
      GENERATED,
      "// The Worker a world runs: the production Worker, with the probes its packages answer (`/_world/probe/*`, `/_world/outbox`) registered. A deployed Worker's entry is main.ts.",
      ...probing.map((p) => `import { probes as ${p}Probes } from "${Names.pkg(p)}/testing";`),
      `import worker, { registerProbes } from "./main.ts";`,
      "",
      `registerProbes({ ${probing.map((p) => `...${p}Probes`).join(", ")} });`,
      "",
      `export * from "./main.ts";`,
      "export default worker;",
    ),
  }];
};
