import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { chartParts, dataNames } from "./types.ts";

// Importing the service would load Pro, which a plain install does not have; the sources say what is exported.
const service = readFileSync(new URL("./service.ts", import.meta.url), "utf8");
const chart = readFileSync(new URL("./internal/chart.ts", import.meta.url), "utf8");

/** The names the `export { A as B } from` lines give out. */
const given = (source: string) => [...source.matchAll(/export \{([^}]*)\} from/g)].flatMap((m) => (m[1] ?? "").split(",").map((part) => part.trim().split(/\s+as\s+/).at(-1) ?? "")).filter((name) => name !== "");

it("exports exactly the declared names", () => {
  expect([...given(service), "Chart"].toSorted()).toEqual([...dataNames].toSorted());
  expect(service).toMatch(/export \* as Chart from "\.\/internal\/chart\.js"/);
});

it("holds the three charts as Area, Bar and Line", () => {
  expect(given(chart).toSorted()).toEqual([...chartParts].toSorted());
});
