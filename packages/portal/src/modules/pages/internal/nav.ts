// The portal's frame as data: the five icons of the rail, the short panel of pages each opens, and the one index ⌘K searches. Everything is
// read from the model, so a page that is not declared is not listed; nothing here reads a trace.
import type { BlueprintWire } from "#modules/wire/types.js";
import { environmentsOf, journeysOf, refusalsOf } from "./model.ts";

export const PANELS = ["things", "proof", "reference", "plugins", "monitor"] as const;
export type PanelName = (typeof PANELS)[number];

export interface PanelPage { readonly panel: PanelName; readonly title: string; readonly href: string }
export interface SearchEntry { readonly kind: "thing" | "operation" | "journey" | "refusal" | "environment" | "monitor"; readonly name: string; readonly href: string; readonly code?: string }

const enc = encodeURIComponent;

/** The pages each icon opens. Reference is pinned to portal.md's order: Access, Refusal codes, Events, Values, Machines. */
export const panelPages = (b: BlueprintWire): ReadonlyArray<PanelPage> => [
  ...Object.keys(b.model.things).map((name) => ({ panel: "things" as const, title: name, href: `/portal/things/${enc(name)}` })),
  ...environmentsOf(b).map((e) => ({ panel: "proof" as const, title: e.name, href: `/portal/environments/${enc(e.name)}` })),
  { panel: "proof", title: "Compare environments", href: "/portal/compare" },
  { panel: "proof", title: "Journeys", href: "/portal/journeys" },
  { panel: "proof", title: "Starting worlds", href: "/portal/starting-worlds" },
  { panel: "reference", title: "Access", href: "/portal/reference/access" },
  { panel: "reference", title: "Refusal codes", href: "/portal/reference/refusals" },
  { panel: "reference", title: "Events", href: "/portal/reference/events" },
  { panel: "reference", title: "Values", href: "/portal/reference/values" },
  { panel: "reference", title: "Machines", href: "/portal/reference/machines" },
  { panel: "plugins", title: "Plugins and stores", href: "/portal/plugins" },
  { panel: "monitor", title: "Alerts", href: "/portal/monitor/alerts" },
  { panel: "monitor", title: "Issues", href: "/portal/monitor/issues" },
];

export const searchIndex = (b: BlueprintWire): ReadonlyArray<SearchEntry> => [
  ...Object.keys(b.model.things).map((name) => ({ kind: "thing" as const, name, href: `/portal/things/${enc(name)}` })),
  ...Object.keys(b.model.operations).map((name) => ({ kind: "operation" as const, name, href: `/portal/operations/${enc(name)}` })),
  ...journeysOf(b).map((j) => ({ kind: "journey" as const, name: j.name, href: "/portal/journeys" })),
  ...Object.entries(refusalsOf(b)).map(([name, code]) => ({ kind: "refusal" as const, name, code, href: "/portal/reference/refusals" })),
  ...environmentsOf(b).map((e) => ({ kind: "environment" as const, name: e.name, href: `/portal/environments/${enc(e.name)}` })),
  { kind: "monitor", name: "Monitor", href: "/portal/monitor" },
  { kind: "monitor", name: "Alerts", href: "/portal/monitor/alerts" },
  { kind: "monitor", name: "Issues", href: "/portal/monitor/issues" },
];
