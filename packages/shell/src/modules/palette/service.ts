import type { PaletteApi } from "./types.ts";
import { passes } from "./internal/rule.ts";

export const Palette: PaletteApi = {
  visible: (entries, caller, page) => {
    const open = new Set(entries.flatMap((e) => (e.kind === "page" && passes(e.allowed, caller) ? [e.name] : [])));
    return entries.filter((e) => (e.kind === "page" ? open.has(e.name) : e.page === page && open.has(e.page) && passes(e.allowed, caller)));
  },
};
