// The projects check 40 generates with the real `ortho generate` and reads the portal's data from: Plugged In (the done-when's own subject), Plugged In in a
// second folder (two generations), acme (starting worlds that chain, a machine with more states), acme with a plugin mounted (a group around its things),
// and Plugged In with one starting world moved onto another (the chain one step deeper).
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { GraphModel, Graphs } from "./graph-expect.ts";
import { freshProject, requireExample } from "./loop.ts";
import { acme, mountEcho, project, repo, succeeds, textAt, writeMount, type Copy } from "./support.ts";

export interface PortalData { readonly model: GraphModel; readonly graphs?: Graphs; readonly [key: string]: unknown }
export interface Generated { readonly root: string; readonly remove: () => void; readonly text: string; readonly wire: PortalData }

const read = (copy: Pick<Copy, "root" | "remove">): Generated => {
  const text = textAt(copy.root, "generated/portal/blueprint.json");
  return { root: copy.root, remove: copy.remove, text, wire: JSON.parse(text) as PortalData };
};

export const pluggedInPath = () => requireExample();
export const committed = (): PortalData => JSON.parse(readFileSync(join(repo, "examples/plugged-in/generated/portal/blueprint.json"), "utf8")) as PortalData;

export const generatePluggedIn = (): Generated => read(freshProject(requireExample()));
export const generateAcme = (): Generated => read(freshProject(acme));

/** Acme with the echo plugin (`@fixture/echo`) mounted: its thing comes from a feature, so the map groups it. */
export const generateWithPlugin = (): Generated => {
  const copy = project("echo");
  try { mountEcho(copy.root); succeeds(copy.root, "generate"); return read(copy); } catch (error) { copy.remove(); throw error; }
};

/** Acme with echo and greet mounted, as check 06 does: greet's mount records `needs: ["feature:echo"]`, so the map draws a `needs` edge between their groups. */
export const generateWithNeeds = (): Generated => {
  const copy = project("echo", "greet");
  try { mountEcho(copy.root); writeMount(copy.root, "feature", "greet", { pkg: "@fixture/greet", verbs: [] }); succeeds(copy.root, "generate"); return read(copy); } catch (error) { copy.remove(); throw error; }
};

/** Plugged In where `page-with-links` begins from `claimed` (a starting world's `from`), generated: the chain is two worlds deep. */
export const generateChained = (): Generated => {
  const copy = freshProject(requireExample());
  try {
    const file = join(copy.root, "blueprint/starting-worlds/page-with-links.ts");
    const source = readFileSync(file, "utf8");
    const edited = source.replace('Blueprint.startingWorld("page-with-links", {\n', 'Blueprint.startingWorld("page-with-links", {\n  from: "claimed",\n');
    if (edited === source) throw new Error("check 40: page-with-links.ts no longer opens the way the control expects");
    writeFileSync(file, edited);
    succeeds(copy.root, "generate");
    return read(copy);
  } catch (error) { copy.remove(); throw error; }
};
