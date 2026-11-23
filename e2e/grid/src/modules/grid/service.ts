import { parseList, switchOn } from "./internal/list.ts";
import { parseExpected, ratchet, ratchetLines } from "./internal/ratchet.ts";
import { combine, lines, run } from "./internal/run.ts";
import type { GridApi } from "./types.ts";

export const Grid: GridApi = { parse: parseList, run, lines, combine, switchOn, parseExpected, ratchet, ratchetLines };
