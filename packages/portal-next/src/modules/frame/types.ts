// The frame every page sits in (design/portal.md, "The frame"): the top bar (the environment and its picker, ⌘K), the icon rail with its panels, the
// things tree, and the live rail scoped to the page. Plain elements with `data-portal` hooks (check 21 reads them), on UI SDK where a part of its
// own fits (the search is its `dialog` and `command`, the tree its `scroll-area`). A page's own headings stay the page's: the frame has none.
import type { ComponentProps, ReactNode } from "react";
import type { NavigationData } from "@orthograph/shell";
import type { PortalData } from "../data/types.ts";
import type { Links } from "../panels/types.ts";

/** Everything the frame is given and never reaches for: the map's data, its typed links, and the one way to move. */
export interface FrameEnv {
  readonly navigation: NavigationData;
  readonly links: Links;
  /** Move to an address through the shell's router (the History API). */
  readonly go: (href: string) => void;
}

export interface PageProps {
  /** The page's own verdict: 200, or 404 for a route that is not a page. */
  readonly status: number;
  /** `data-ready`: the page has drawn from the data API. */
  readonly ready?: boolean;
  /** What the frame is drawn from. A page with none (loading, a failure, not found) has no frame. */
  readonly data?: PortalData | undefined;
  /** The rail's scope: `all`, or `thing:<name>`. */
  readonly scope?: string;
  /** The operations the rail counts; every operation when absent. */
  readonly operations?: ReadonlyArray<string> | undefined;
  readonly children?: ReactNode;
}

export interface FrameApi {
  /** Gives the frame its env, to every part below it. */
  readonly Provider: (props: { readonly env: FrameEnv; readonly children: ReactNode }) => ReactNode;
  /** The page's one root, and the frame around it when there is data. */
  readonly Page: (props: PageProps) => ReactNode;
  /** A link that goes through the router on a plain click and is a real `a` for everything else. */
  readonly Link: (props: ComponentProps<"a"> & { readonly href: string }) => ReactNode;
}
