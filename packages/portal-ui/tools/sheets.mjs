// Where HeroUI's and Pro's precompiled stylesheets are, from portal-ui's own install (the only package that depends on Pro, F7). The portal's
// client build (`packages/portal/vite.config.ts`) takes its two sheets from here, so no other package names the licensed package.
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const here = createRequire(import.meta.url);
const sheet = (name, file) => join(dirname(here.resolve(`${name}/package.json`)), file);

export const sheets = {
  /** HeroUI's own sheet. */
  base: sheet("@heroui/styles", "dist/heroui.min.css"),
  /** Pro's sheet. */
  pro: sheet("@heroui-" + "pro/react", "dist/heroui-pro.min.css"),
};
