// The pages: a body for each page of the app's map, by the page's name (`generated/app/routes.json`). The shell matches the address and gives the
// page its element and its parameters; a page paints itself into it and returns the way to take its work down. The frame is built; what a page
// holds beyond it is later slices': a page is a stub until then, and a stub still carries its `data-portal="page"` hook and says so.
import type { PageFn } from "@orthograph/shell";
import type { Store } from "../data/types.ts";
import type { FrameEnv } from "../frame/types.ts";

export interface PagesDeps {
  /** The one store of what the data API answered. */
  readonly store: Store;
  /** The map's data, its typed links and the router's move, for the frame. */
  readonly env: FrameEnv;
}

export interface PagesApi {
  /** One painter for each page of the map, to hand to the shell as `pages`. */
  readonly painters: (deps: PagesDeps) => Readonly<Record<string, PageFn>>;
}
