// The preset generator Nx runs for `create-nx-workspace --preset=@orthograph/preset`.
import type { Tree } from "@nx/devkit";
import { Starter } from "#modules/starter/service.js";
import type { PresetOptions } from "#modules/starter/types.js";

export default function preset(tree: Tree, options: PresetOptions) {
  return Starter.write(tree, options, Starter.bundled());
}
