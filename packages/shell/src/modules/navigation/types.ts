// The navigation: the groups of `generated/app/navigation.json`, resolved against where the person is. Each page of a group is a link only
// where the current route has every parameter the page needs; otherwise it is shown, and is no link.
import type { Match } from "../router/types.ts";

/** One page of a group, as `navigation.json` has it. */
export interface NavigationPage {
  readonly page: string;
  readonly path: string;
}

export interface NavigationGroupData {
  readonly title: string;
  readonly folded: boolean;
  readonly pages: ReadonlyArray<NavigationPage>;
}

/** The contents of `generated/app/navigation.json`, as they are. */
export interface NavigationData {
  readonly layout: string;
  readonly home: string;
  readonly groups: ReadonlyArray<NavigationGroupData>;
}

/** A page in a group: its name, where it goes (`undefined`: no link on this route) and whether it is the page shown. */
export interface NavItem {
  readonly page: string;
  readonly href: string | undefined;
  readonly current: boolean;
}

export interface NavGroup {
  readonly title: string;
  readonly folded: boolean;
  readonly items: ReadonlyArray<NavItem>;
}

/** The address a page has for the current route's parameters, `undefined` where the route lacks one (the router's `href`). */
export type Resolve = (page: string) => string | undefined;

/** The layouts the shell draws. */
export type Layout = "sidebar" | "topNav" | "none";

export interface NavigationApi {
  /** The groups in the order declared, each page with its link for the route shown (`current` is `undefined` on the 404). */
  readonly derive: (data: NavigationData, resolve: Resolve, current: Match | undefined) => ReadonlyArray<NavGroup>;
  /** The layout the app names, read as one of the three; any other word is the default, the sidebar. */
  readonly layoutOf: (name: string) => Layout;
}
