// The frame as data: the five icons of the rail and the short panel of pages each opens, and the one index ⌘K searches. The groups and the
// addresses of the pages that are always there come from the app's own map (`generated/app/navigation.json`); only what the model adds
// (a page per thing, one per environment, a code per refusal) is read from the blueprint, and each of those addresses is a typed link of
// `generated/app/links.ts`. No path is written in this package.
import type { NavigationData } from "@orthograph/shell";
import type { BlueprintWire } from "@orthograph/portal";

/** The addresses of the pages that take a name, from `generated/app/links.ts` (`links` of the app projection satisfies this as it is). */
export interface Links {
  readonly home: () => string;
  readonly thing: (params: { readonly name: string }) => string;
  readonly operation: (params: { readonly name: string }) => string;
  readonly environment: (params: { readonly name: string }) => string;
  readonly trace: (params: { readonly id: string }) => string;
  readonly journeys: () => string;
  readonly refusals: () => string;
  readonly monitor: () => string;
}

/** The icon rail's panels, in the order the map's navigation groups are declared. */
export type PanelName = "things" | "proof" | "reference" | "plugins" | "monitor";

export interface PanelPage {
  readonly panel: string;
  readonly title: string;
  readonly href: string;
}

export interface SearchEntry {
  readonly kind: "thing" | "operation" | "journey" | "refusal" | "environment" | "monitor";
  readonly name: string;
  readonly href: string;
  readonly code?: string;
}

export interface PanelsApi {
  /** The pages each icon opens, panel by panel in the map's order: a map page is one entry, `thing` and `environment` one per declared name. */
  readonly pages: (navigation: NavigationData, links: Links, blueprint: BlueprintWire) => ReadonlyArray<PanelPage>;
  /** The one index ⌘K searches: things, operations, journeys, refusal codes, environments and the monitor page. */
  readonly searchIndex: (links: Links, blueprint: BlueprintWire) => ReadonlyArray<SearchEntry>;
}
