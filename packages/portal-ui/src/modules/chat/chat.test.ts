import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { chatParts } from "./types.ts";

// Importing the service would load Pro, which a plain install does not have; the sources say what is exported.
const parts = readFileSync(new URL("./internal/parts.ts", import.meta.url), "utf8");
const service = readFileSync(new URL("./service.ts", import.meta.url), "utf8");

it("exports exactly the declared parts, each as a Pro component under our name", () => {
  const exported = [...parts.matchAll(/\bas\s+(\w+)\b/g)].map((m) => m[1]);
  expect(exported.toSorted()).toEqual([...chatParts].toSorted());
});

it("exposes them as the one namespace, Chat", () => {
  expect(service).toMatch(/export \* as Chat from "\.\/internal\/parts\.js"/);
});
