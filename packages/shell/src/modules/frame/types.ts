// The frame: the React parts that draw the shell (K31 section 3) over what the other modules decide. The whole contract of `mountShell` is `ShellProps`.
import type { History } from "../history/types.ts";
import type { NavigationData } from "../navigation/types.ts";
import type { Caller, OperationEntry, PaletteEntry } from "../palette/types.ts";
import type { Params, RouteTable } from "../router/types.ts";

/** A page paints itself into the element the shell gives it; the look is the page's own code (K31 section 2). What it returns runs when the page is left. */
export type PageFn = (el: HTMLElement, params: Params) => void | (() => void);

/** A mounted feature fills a slot the same way. The navigation is the shell's own, so `nav` is not one a caller fills. */
export type SlotFn = (el: HTMLElement) => void | (() => void);

export type SlotName = "header" | "switcher" | "footer" | "actions";

export type Slots = { readonly [name in SlotName]?: SlotFn };

/** The part of `generated/app/map.json` the shell reads: the home every breadcrumb starts from (the layout is `navigation.json`'s). */
export interface MapData {
  readonly home: string;
}

export interface ShellProps {
  /** `generated/app/routes.json`, as it is. */
  readonly routes: RouteTable;
  /** `generated/app/navigation.json`, as it is. */
  readonly navigation: NavigationData;
  /** `generated/app/map.json`, as it is. */
  readonly map: MapData;
  /** The `entries` of `generated/app/palette.json`. */
  readonly palette: ReadonlyArray<PaletteEntry>;
  /** What the palette lists: an anonymous caller, or a person. */
  readonly caller: Caller;
  /** A body for each page, by the page's name. */
  readonly pages: Readonly<Record<string, PageFn>>;
  readonly slots?: Slots;
  /** Called when a person picks an operation in the palette. The shell calls nothing itself: running an operation is the app's. */
  readonly onOperation?: (entry: OperationEntry) => void;
}

/** What the root component takes: the props, and the address it follows. */
export interface FrameProps {
  readonly props: ShellProps;
  readonly history: History;
}
