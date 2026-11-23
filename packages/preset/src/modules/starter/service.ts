import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { installPackagesTask } from "@nx/devkit";
import { Effect } from "effect";
import type { Model } from "@orthograph/compiler";
import { Render } from "@orthograph/generators/render";
import type { StarterApi } from "./types.ts";
import { IGNORES, TSCONFIG, WORKSPACE, mergeWorkspace, packageJson } from "./internal/project.ts";

const PARTS = ["blueprint", "src", "journeys"];

const walk = (dir: string): ReadonlyArray<string> =>
  existsSync(dir) ? readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? walk(join(dir, d.name)) : [join(dir, d.name)])) : [];

const read: StarterApi["read"] = (root, version) => ({
  files: PARTS.flatMap((p) => walk(join(root, p))).map((f) => ({ path: relative(root, f), content: readFileSync(f, "utf8") })),
  model: readFileSync(join(root, "generated/model/model.json"), "utf8"),
  version,
});

const write: StarterApi["write"] = (tree, { name }, source) => {
  for (const f of source.files) tree.write(f.path, f.content);
  // generated/ is rendered for this project's name; the handlers are the starter's own, so no scaffold is written.
  // The starter mounts no projection, so the model, the api and the server are rendered as they always were.
  for (const f of Effect.runSync(Render.files({ name, model: JSON.parse(source.model) as Model }))) if (!f.scaffold) tree.write(f.path, f.content);
  const existing = tree.exists("package.json") ? (JSON.parse(tree.read("package.json", "utf8")!) as Record<string, unknown>) : {};
  tree.write("package.json", JSON.stringify(packageJson(existing, name, source.version), null, 2) + "\n");
  tree.write("tsconfig.json", JSON.stringify(TSCONFIG, null, 2) + "\n");
  const ignore = tree.exists(".gitignore") ? tree.read(".gitignore", "utf8")! : "";
  tree.write(".gitignore", [ignore.trimEnd(), ...IGNORES.filter((i) => !ignore.includes(i))].filter(Boolean).join("\n") + "\n");
  const workspace = tree.exists("pnpm-workspace.yaml") ? tree.read("pnpm-workspace.yaml", "utf8")! : "";
  tree.write("pnpm-workspace.yaml", mergeWorkspace(workspace, WORKSPACE));
  return () => installPackagesTask(tree);
};

export const Starter: StarterApi = { read, write };
