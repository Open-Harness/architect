import type { Layout, NavigationApi } from "./types.ts";
import { deriveGroups } from "./internal/derive.ts";

const LAYOUTS: ReadonlyArray<string> = ["sidebar", "topNav", "none"];

export const Navigation: NavigationApi = {
  derive: deriveGroups,
  layoutOf: (name): Layout => (LAYOUTS.includes(name) ? (name as Layout) : "sidebar"),
};
