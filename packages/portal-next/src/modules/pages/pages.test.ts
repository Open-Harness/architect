import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { PortalData } from "../data/types.ts";
import { Data } from "../data/service.ts";
import { Frame } from "../frame/service.ts";
import type { FrameEnv } from "../frame/types.ts";
import { Drawn } from "./internal/draw.tsx";
import { EnvironmentPage } from "./internal/environment.tsx";
import { ThingPage } from "./internal/thing.tsx";
import { Pages } from "./service.ts";

const generated = (file: string): { readonly routes: ReadonlyArray<{ readonly page: string }> } =>
  JSON.parse(readFileSync(join(import.meta.dirname, "../../../generated/app", file), "utf8"));

const env: FrameEnv = {
  navigation: { layout: "none", home: "home", groups: [] },
  links: { home: () => "/", thing: () => "/", operation: () => "/", environment: () => "/", trace: () => "/", journeys: () => "/", refusals: () => "/", monitor: () => "/" },
  go: () => undefined,
};
const data = {
  blueprint: { project: "demo", model: { things: { handle: { name: "handle", machine: null } }, operations: {}, environments: { local: { name: "local" }, test: { name: "test" } } } },
  snapshot: { telemetry: { environment: "local", windowMs: 1, metrics: { state: "unavailable", reason: "x" }, calls: { state: "unavailable", reason: "x" } } },
} as unknown as PortalData;

const render = (node: ReturnType<typeof createElement>): string => renderToString(Frame.Provider({ env, children: node }));

describe("painters", () => {
  it("has a painter for every page of the generated route table, and none for a page the map does not have", () => {
    const painters = Pages.painters({ store: Data.store(), env });
    expect(Object.keys(painters).sort()).toEqual(generated("routes.json").routes.map((r) => r.page).sort());
  });
});

describe("Drawn", () => {
  it("is the page's root with data-ready false while the data is loading", () => {
    const store = Data.store();
    const text = renderToString(createElement(Drawn, { store, env, params: {}, body: () => null }));
    expect(text).toMatch(/data-portal="page"[^>]*data-ready="false"|data-ready="false"[^>]*data-portal="page"/);
  });

  it("is a 502 naming the request when the data could not be read", () => {
    const store = Data.store();
    store.settle({ state: "failed", failure: { _tag: "DataFailed", request: "/_portal/v1/blueprint", reason: "it answered 500" } });
    const text = renderToString(createElement(Drawn, { store, env, params: {}, body: () => null }));
    expect(text).toContain('data-status="502"');
    expect(text).toContain("/_portal/v1/blueprint: it answered 500");
  });
});

describe("a page that names something the blueprint does not declare", () => {
  it("is a 404 for a thing, and for an environment", () => {
    expect(render(createElement(ThingPage, { data, name: "nowhere" }))).toContain('data-status="404"');
    expect(render(createElement(EnvironmentPage, { data, name: "nowhere" }))).toContain('data-status="404"');
    expect(render(createElement(ThingPage, { data, name: "nowhere" })), "the frame stays around a 404").toContain('data-portal="top-bar"');
  });

  it("is a 200 for one that it declares, and says whose portal reads another environment", () => {
    expect(render(createElement(ThingPage, { data, name: "handle" }))).toContain('data-status="200"');
    const other = render(createElement(EnvironmentPage, { data, name: "test" }));
    expect(other).toContain('data-live="false"');
    expect(other).toMatch(/own portal/);
  });
});
