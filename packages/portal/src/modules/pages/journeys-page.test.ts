// The journeys page drawn for real (review of #297, blocker 4): a `.tools()` step has no `call`, so the page's guard must draw it as the skipped step it is.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Effect } from "effect";
import { describe, expect, it, vi } from "vitest";
import { Wire } from "#modules/wire/service.js";
import { JourneysPage } from "./internal/journeys.tsx";

// The frame (the shell, HeroUI Pro) is not what is under test, and Pro is not installable everywhere: the page's own body is.
vi.mock("./internal/parts.tsx", () => ({ Page: ({ children }: { children?: unknown }) => createElement("main", null, children as never) }));
vi.mock("./internal/not-yet.tsx", () => ({ NotYet: () => null }));
import type { PortalData } from "./types.ts";

describe("JourneysPage", () => {
  it("draws acme's principal journeys, a tools step among them, without throwing", async () => {
    const raw = JSON.parse(readFileSync(resolve(import.meta.dirname, "../../../../../examples/acme/generated/portal/blueprint.json"), "utf8")) as unknown;
    const blueprint = await Effect.runPromise(Wire.decode(raw));
    const data = { blueprint, snapshot: { telemetry: null } } as unknown as PortalData;
    const html = renderToStaticMarkup(createElement(JourneysPage, { data }));
    expect(html).toContain('data-name="an agent cannot consent for a person"');
    expect(html).toMatch(/data-title="an agent&#x27;s tools hold no way to consent[^"]*" data-skipped="[^"]*tools list/);
    expect(html).toContain("data-operation=\"invitation.accept\"");
  });
});
