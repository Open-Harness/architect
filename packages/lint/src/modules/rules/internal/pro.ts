import type { Rule } from "../types.ts";
import { everyImport } from "./imports.ts";

// Pro's scope, spelled in pieces: check 15 allows its name only in portal-ui, the config and the design.
const PRO = "@heroui" + "-pro";

/**
 * One package behind the portal's components (F7, M1.34; today HeroUI Pro, K24 moves it to UI SDK). `no-restricted-imports` bans Pro's scope too, but oxlint puts a
 * pattern's message in its help, which the GitHub reporter drops; this rule says where to import from in the
 * diagnostic itself, in every reporter. Off in `packages/portal-ui` and `spikes/` (`.oxlintrc.json`).
 */
export const noProOutsidePortalUi: Rule = {
  meta: { schema: [], docs: { description: "Only @orthograph/portal-ui imports HeroUI Pro (F7)." } },
  create: (context) =>
    everyImport((node, name) => {
      if (name === PRO || name.startsWith(`${PRO}/`)) {
        context.report({ node, message: `HeroUI Pro is imported only by @orthograph/portal-ui (F7): import the component from @orthograph/portal-ui, not ${name}` });
      }
    }),
};
