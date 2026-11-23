import type { Rule } from "../types.ts";
import { everyImport } from "./imports.ts";

// The UI's names: React, the portal's UI and HeroUI (both packages). Pro's scope is spelled in pieces, as `pro.ts` does.
const UI = [/^react(-dom)?(\/|$)/, /^@orthograph\/portal-ui(\/|$)/, /^@heroui(-pro)?\//];

/**
 * K19, the portal ships prebuilt: the code a Worker bundles never imports the UI. A Worker has no use for React, and a project that
 * bundled `@orthograph/portal-ui` would need a HeroUI Pro licence to build. On for `generated/` folders and the portal's server half;
 * off for the client half (`.oxlintrc.json`), which is built once in this repository and shipped as static files.
 */
export const noUiInWorker: Rule = {
  meta: { schema: [], docs: { description: "K19: nothing a Worker bundles imports react, @orthograph/portal-ui or HeroUI." } },
  create: (context) =>
    everyImport((node, name) => {
      if (UI.some((pattern) => pattern.test(name))) {
        context.report({ node, message: `K19: '${name}' is the portal's UI, and a Worker never imports it: the client is built once, in this repository, and ships as static files; the Worker imports only @orthograph/portal/server` });
      }
    }),
};
