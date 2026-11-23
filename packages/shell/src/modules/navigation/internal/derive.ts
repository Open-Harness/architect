import type { Match } from "../../router/types.ts";
import type { NavGroup, NavigationData, Resolve } from "../types.ts";

export const deriveGroups = (data: NavigationData, resolve: Resolve, current: Match | undefined): ReadonlyArray<NavGroup> =>
  data.groups.map((group) => ({
    title: group.title,
    folded: group.folded,
    items: group.pages.map(({ page }) => ({ page, href: resolve(page), current: current?.page === page })),
  }));
