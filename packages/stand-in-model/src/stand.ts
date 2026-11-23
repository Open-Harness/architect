// What a journey imports (`@orthograph/stand-in-model/stand`): the model stand-in's commands as descriptors, a mount, a name and two types.
// The process itself (`main.ts`) is never imported from here (harness-01).
import { Stand } from "orthograph";
import type { Hold, ModelTurn, Seen, Who } from "./modules/script/types.ts";

export type { Hold, ModelTurn, Seen, Who };

/** `Match` of the common commands, as the model reads it: only a request's number counts here. */
export interface Match { readonly method?: string; readonly path?: string; readonly nth?: number }
export interface HeldRequest { readonly id: string; readonly n: number; readonly about?: string; readonly agent?: string }

export const models = {
  /** Requests the model was asked, in order: `containing` is a substring over every message it got. */
  seen: Stand.command<{ match?: Match; containing?: string; since?: number }, { requests: ReadonlyArray<Seen>; next: number }>("models", "seen"),
  /** Keep the next matching requests back before they are answered. */
  hold: Stand.command<{ match?: Match; when?: "before"; times?: number }, { hold: string }>("models", "hold"),
  /** Wait (at most 10 s of real time) until `count` requests are held. */
  held: Stand.command<{ match?: Match; count: number; waitMs?: number }, { held: ReadonlyArray<HeldRequest> }>("models", "held"),
  release: Stand.command<{ hold?: string | "all" }, { released: number }>("models", "release"),
  fail: Stand.command<{ match?: Match; with: { status: number } | "reset"; times?: number }, {}>("models", "fail"),
  reset: Stand.command<{}, {}>("models", "reset"),
  /** One turn is used per matching request, in order. */
  script: Stand.command<{ for: Who; turns: ReadonlyArray<ModelTurn> }, { script: string }>("models", "script"),
  /** 200 only when every scripted turn was used; else 409 with the unused ones. */
  done: Stand.command<{}, { unused: number }>("models", "done"),
};
