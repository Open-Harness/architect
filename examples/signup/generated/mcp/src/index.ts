// Generated from the blueprint. Do not edit.
import type { McpEntry } from "@orthograph/language-effect";
import { declaration as sheetClose } from "../../api/src/sheet/close.ts";
import { declaration as sheetGet } from "../../api/src/sheet/get.ts";
import { declaration as sheetJoin } from "../../api/src/sheet/join.ts";
import { declaration as sheetOpen } from "../../api/src/sheet/open.ts";

/** One tool per operation and read, named as the operation is. */
export const catalog = {
  "sheet.close": { description: "Take a sheet down. Nobody can join it after this.", operation: sheetClose, states: ["open","full","closed"], move: {"key":"close","from":["open","full"],"to":["closed"],"emits":"SheetClosed"} },
  "sheet.get": { description: "Read one sheet by its id: title, places, taken, state.", operation: sheetGet, states: ["open","full","closed"] },
  "sheet.join": { description: "Take places on a sheet, for yourself and anyone with you.", operation: sheetJoin, states: ["open","full","closed"], move: {"key":"join","from":["open"],"to":["open","full"],"emits":"PlaceTaken"} },
  "sheet.open": { description: "Put up a sheet with a number of places.", operation: sheetOpen, states: ["open","full","closed"], move: {"key":"open","from":[],"to":["open"],"emits":"SheetOpened"} },
} as const satisfies { readonly [name: string]: McpEntry };
