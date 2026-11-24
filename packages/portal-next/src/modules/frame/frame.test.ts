import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { PortalData } from "../data/types.ts";
import { Frame } from "./service.ts";
import type { FrameEnv } from "./types.ts";

const env: FrameEnv = {
  navigation: {
    layout: "none",
    home: "home",
    groups: [
      { title: "things", folded: false, pages: [{ page: "thing", path: "/p/things/:name" }] },
      { title: "proof", folded: false, pages: [{ page: "environment", path: "/p/environments/:name" }, { page: "compare", path: "/p/compare" }] },
    ],
  },
  links: {
    home: () => "/p", thing: ({ name }) => `/p/things/${name}`, operation: ({ name }) => `/p/operations/${name}`, environment: ({ name }) => `/p/environments/${name}`,
    trace: ({ id }) => `/p/traces/${id}`, journeys: () => "/p/journeys", refusals: () => "/p/refusals", monitor: () => "/p/monitor",
  },
  go: () => undefined,
};

const counts = { calls: 5, answered: 1, refused: 4, defects: 0, refusals: {}, doorRefusals: 0 };
const data = {
  blueprint: {
    project: "demo",
    model: {
      things: { handle: { name: "handle" } },
      operations: { "handle.claim": { name: "handle.claim", thing: "handle", verb: "claim" } },
      environments: { local: { name: "local" }, test: { name: "test" } },
      refusals: { HandleTaken: "HN-001" },
      journeys: {},
    },
  },
  snapshot: {
    telemetry: {
      environment: "local",
      windowMs: 1_800_000,
      metrics: { state: "available", value: { operations: { "handle.claim": counts }, refusals: {} } },
      calls: { state: "available", value: { rows: [{ trace: "ab12", operation: "handle.claim", outcome: "answered", caller: "person", attempts: 2, durationMs: 9 }], truncated: 0, moves: {}, journeys: {} } },
    },
  },
} as unknown as PortalData;

const html = (page: PortalData | undefined, scope = "all"): string =>
  renderToString(Frame.Provider({ env, children: createElement(Frame.Page, { status: 200, data: page, scope }, createElement("h1", null, "body")) }));

const attrs = (text: string, part: string): Array<Record<string, string>> =>
  [...text.matchAll(new RegExp(`<[a-z]+\\b[^>]*\\bdata-portal="${part}"[^>]*>`, "g"))].map(([tag]) => Object.fromEntries([...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map(([, k, v]) => [k, v])));

describe("Frame.Page with data", () => {
  const text = html(data, "thing:handle");

  it("is the page's one root, ready, and carries the top bar with the environment and the window", () => {
    expect(attrs(text, "page")[0]).toMatchObject({ "data-ready": "true", "data-status": "200" });
    expect(attrs(text, "top-bar")[0]).toMatchObject({ "data-environment": "local", "data-window-ms": "1800000" });
  });

  it("lists the declared environments in the picker and marks the one this portal reads", () => {
    expect(attrs(text, "env-option").map((o) => `${o["data-environment"]}:${o["data-current"]}:${o["data-href"]}`)).toEqual(["local:true:/p/environments/local", "test:false:/p/environments/test"]);
  });

  it("draws one icon for each group of the map's navigation, in its order, and each panel's pages", () => {
    expect(attrs(text, "rail-icon").map((i) => i["data-panel"])).toEqual(["things", "proof"]);
    expect(attrs(text, "panel-page").map((p) => `${p["data-panel"]}:${p["data-title"]}`)).toEqual(["things:handle", "proof:local", "proof:test", "proof:Compare environments"]);
  });

  it("draws the tree, the ⌘K trigger with its index in the page, and the rail scoped to the page", () => {
    expect(attrs(text, "tree-item").map((i) => `${i["data-kind"]}:${i["data-name"]}`)).toEqual(["thing:handle", "operation:handle.claim"]);
    expect(attrs(text, "search-trigger")[0]).toMatchObject({ "data-shortcut": "⌘K" });
    expect(text).toContain('data-portal="search-index"');
    expect(attrs(text, "rail")[0]).toMatchObject({ "data-scope": "thing:handle" });
    expect(attrs(text, "stat").map((s) => `${s["data-stat"]}=${s["data-value"]}`)).toEqual(["calls=5", "answered=1", "refused=4", "defects=0"]);
    expect(attrs(text, "last-call")[0]).toMatchObject({ "data-trace": "ab12", "data-attempts": "2" });
  });
});

describe("Frame.Page without data", () => {
  it("is the page's root and nothing else: no frame is drawn around a page that has nothing true to put in one", () => {
    const text = html(undefined);
    expect(attrs(text, "page")).toHaveLength(1);
    expect(attrs(text, "top-bar")).toEqual([]);
  });

  it("says `not yet` with the reason, and no number, when the portal has no live source", () => {
    const dark = { ...data, snapshot: { telemetry: null } } as unknown as PortalData;
    const text = html(dark);
    expect(attrs(text, "top-bar")[0]).toMatchObject({ "data-environment": "not yet" });
    expect(attrs(text, "stat")).toEqual([]);
    expect(attrs(text, "not-yet").map((n) => n["data-hole"])).toEqual(["metrics", "calls"]);
  });
});
