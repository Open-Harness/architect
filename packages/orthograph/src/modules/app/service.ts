import type { AppApi } from "./types.ts";
import { LAYOUTS } from "./internal/layouts.ts";

export const Apps: AppApi = {
  app: (spec) => Object.freeze({ ...spec, kind: "app" }),
  page: (spec) => Object.freeze({ ...spec, kind: "app-page" }),
  component: (spec) => Object.freeze({ ...spec, kind: "app-component" }),
  layout: LAYOUTS,
  nav: Object.freeze({ group: (spec) => Object.freeze({ ...spec, folded: spec.folded ?? false, kind: "app-nav-group" }) }),
};
