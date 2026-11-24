import { describe, expect, it } from "vitest";
import type { BlueprintWire } from "@orthograph/portal";
import { Panels } from "./service.ts";
import type { Links } from "./types.ts";

const links: Links = {
  home: () => "/p",
  thing: ({ name }) => `/p/things/${name}`,
  operation: ({ name }) => `/p/operations/${name}`,
  environment: ({ name }) => `/p/environments/${name}`,
  trace: ({ id }) => `/p/traces/${id}`,
  journeys: () => "/p/journeys",
  refusals: () => "/p/reference/refusals",
  monitor: () => "/p/monitor",
};
const navigation = {
  layout: "none",
  home: "home",
  groups: [
    { title: "things", folded: false, pages: [{ page: "thing", path: "/p/things/:name" }] },
    { title: "proof", folded: false, pages: [{ page: "environment", path: "/p/environments/:name" }, { page: "compare", path: "/p/compare" }, { page: "journeys", path: "/p/journeys" }] },
    { title: "reference", folded: false, pages: [{ page: "access", path: "/p/reference/access" }, { page: "refusals", path: "/p/reference/refusals" }] },
  ],
};
const blueprint = {
  model: {
    things: { handle: {}, link: {} },
    operations: { "handle.claim": {}, "link.add": {} },
    environments: { local: { name: "local" }, test: { name: "test" } },
    refusals: { HandleTaken: "HN-001" },
    journeys: { a: { name: "claim a name" } },
  },
} as unknown as BlueprintWire;

describe("pages", () => {
  it("is each group of the map in order, with a page per thing and per environment where the map has a page that takes a name", () => {
    expect(Panels.pages(navigation, links, blueprint).map((p) => `${p.panel}:${p.title}=${p.href}`)).toEqual([
      "things:handle=/p/things/handle",
      "things:link=/p/things/link",
      "proof:local=/p/environments/local",
      "proof:test=/p/environments/test",
      "proof:Compare environments=/p/compare",
      "proof:Journeys=/p/journeys",
      "reference:Access=/p/reference/access",
      "reference:Refusal codes=/p/reference/refusals",
    ]);
  });
});

describe("searchIndex", () => {
  it("lists what the model declares, each at its typed link, and the monitor page", () => {
    const index = Panels.searchIndex(links, blueprint);
    expect(index.map((e) => `${e.kind}:${e.name}`)).toEqual([
      "thing:handle", "thing:link", "operation:handle.claim", "operation:link.add", "journey:claim a name", "refusal:HandleTaken", "environment:local", "environment:test", "monitor:Monitor",
    ]);
    expect(index.find((e) => e.kind === "refusal")).toMatchObject({ code: "HN-001", href: "/p/reference/refusals" });
  });
});
