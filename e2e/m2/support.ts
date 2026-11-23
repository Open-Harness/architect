// What every M2 check shares: the fixture app (`e2e/fixtures/m2/app`, which mounts the two fixture plugins), copied
// somewhere of its own with the plugins packed and installed, and the ortho command run as a user runs it.
import { cpSync, existsSync } from "node:fs";
import { join } from "node:path";
import { acme, copyOf, nothingRunning, ortho, repo } from "../layer1/support.ts";
import { freePorts } from "../ports.ts";
import { fixtures, installFixture } from "./packages.ts";

export { acme, fixtures, nothingRunning, repo };

/** This milestone's ports: free ones picked when the file loads (`e2e/ports.ts`). */
export const PORTS = freePorts("empty", "shipped");

export interface Copy {
  readonly root: string;
  readonly remove: () => void;
}

/** The plugins the fixture app mounts, in the order they are installed (organizations needs auth). */
export const PLUGINS = ["auth", "organizations"] as const;

/**
 * The fixture app as a project of its own: acme's package.json and tools, none of acme's blueprint, the app's own files
 * (`ortho.config.ts`, `blueprint/**`) and, with `variant`, the overlay `app/variants/<variant>/`; both plugins installed.
 */
export const app = (variant?: string): Copy => {
  const copy = copyOf(acme, ["package.json"]);
  try {
    const source = join(fixtures, "app");
    for (const part of ["ortho.config.ts", "blueprint"]) cpSync(join(source, part), join(copy.root, part), { recursive: true });
    if (variant !== undefined) {
      const overlay = join(source, "variants", variant);
      if (!existsSync(overlay)) throw new Error(`no variant ${variant} of the fixture app`);
      cpSync(overlay, copy.root, { recursive: true });
    }
    for (const kind of PLUGINS) installFixture(copy.root, kind);
  } catch (error) { copy.remove(); throw error; }
  return copy;
};

export const run = (root: string, ...args: ReadonlyArray<string>) => {
  const result = ortho(root, ...args);
  return { ...result, out: `${result.stdout}${result.stderr}` };
};
