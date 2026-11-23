import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { contentNames } from "./types.ts";

// Importing the service would load Pro, which a plain install does not have; the source says what is exported.
const service = readFileSync(new URL("./service.ts", import.meta.url), "utf8");

it("exports exactly the declared names", () => {
  const exported = [...service.matchAll(/export \{([^}]*)\} from/g)].flatMap((m) => (m[1] ?? "").split(",").map((part) => part.trim().split(/\s+as\s+/).at(-1) ?? "")).filter((name) => name !== "");
  expect(exported.toSorted()).toEqual([...contentNames].toSorted());
});
