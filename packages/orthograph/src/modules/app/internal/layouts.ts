// The three layouts a map may name (K31 section 3): each a frozen value the compiler reads by its `which`.
import type { AppLayout, LayoutName } from "../types.ts";

const layoutOf = (which: LayoutName): AppLayout => Object.freeze({ kind: "app-layout", which });

export const LAYOUTS = Object.freeze({ sidebar: layoutOf("sidebar"), topNav: layoutOf("topNav"), none: layoutOf("none") });
