// Generated from blueprint/projections/mcp.ts. Do not edit.
import type { McpEntry } from "@orthograph/language-effect";
import { declaration as handleClaim } from "../../api/src/handle/claim.ts";
import { declaration as handleRelease } from "../../api/src/handle/release.ts";
import { declaration as handleResolve } from "../../api/src/handle/resolve.ts";
import { declaration as linkAdd } from "../../api/src/link/add.ts";
import { declaration as linkOrder } from "../../api/src/link/order.ts";
import { declaration as linkRemove } from "../../api/src/link/remove.ts";
import { declaration as profileGet } from "../../api/src/profile/get.ts";

/** One tool per operation and read, named as the operation is. */
export const catalog = {
  "handle.claim": { description: "Claim a free name and make it the address of your public page, with its profile. Refuses HandleTaken when another claimed handle holds this name. Refuses HandleAlreadyOwned when you already hold a name.", operation: handleClaim, states: ["claimed","released"], move: {"key":"claim","from":[],"to":["claimed"],"emits":"HandleClaimed"} },
  "handle.release": { description: "Free your name and take its public page offline. Anyone may claim the name afterwards.", operation: handleRelease, states: ["claimed","released"], move: {"key":"release","from":["claimed"],"to":["released"],"emits":"HandleReleased"} },
  "handle.resolve": { description: "Find the handle that holds a claimed name. A released or unclaimed name has none.", operation: handleResolve, states: ["claimed","released"] },
  "link.add": { description: "Append a link to your own public page. You need a claimed name first.", operation: linkAdd, states: ["listed","removed"], move: {"key":"add","from":[],"to":["listed"],"emits":"LinkAdded"} },
  "link.order": { description: "Move a link to a zero-based position. A position past the end puts it last.", operation: linkOrder, states: ["listed","removed"] },
  "link.remove": { description: "Remove a link from a public page.", operation: linkRemove, states: ["listed","removed"], move: {"key":"remove","from":["listed"],"to":["removed"],"emits":"LinkRemoved"} },
  "profile.get": { description: "Read a claimed name's public page and its links in display order.", operation: profileGet },
} as const satisfies { readonly [name: string]: McpEntry };
