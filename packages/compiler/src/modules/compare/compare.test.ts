import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { Model } from "#modules/model/types.js";
import { Compare } from "./service.ts";

const repo = resolve(import.meta.dirname, "../../../../..");
const model = JSON.parse(execFileSync(process.execPath, [resolve(repo, "packages/compiler/src/main.ts"), resolve(repo, "examples/acme")], { encoding: "utf8" })) as Model;
const edited = (edit: (m: { -readonly [K in keyof Model]: any }) => void): Model => {
  const copy = structuredClone(model) as { -readonly [K in keyof Model]: any };
  edit(copy);
  return copy as Model;
};

describe("Compare", () => {
  it("finds nothing between a model and itself", () => {
    expect(Compare.models(model, model)).toEqual([]);
  });

  it("names the declaration and the part that changed", () => {
    const looser = edited((m) => {
      m.operations["allowance.spend"] = { ...m.operations["allowance.spend"], budget: { p95Ms: 300 }, hash: "other" };
    });
    expect(Compare.models(model, looser)).toEqual([{ kind: "operation", name: "allowance.spend", change: "changed", parts: ["budget"] }]);
  });

  it("lists added and removed declarations", () => {
    const after = edited((m) => {
      m.operations["allowance.list"] = { ...m.operations["allowance.get"], name: "allowance.list" };
      delete m.operations["organization.create"];
    });
    expect(Compare.models(model, after)).toEqual([
      { kind: "operation", name: "allowance.list", change: "added", parts: [] },
      { kind: "operation", name: "organization.create", change: "removed", parts: [] },
    ]);
  });

  it("says an operation's proof rests on itself, its thing and the things it refers to", () => {
    const depends = Compare.dependsOn(model, "allowance.grant");
    expect(Object.keys(depends)).toEqual(["operation:allowance.grant", "thing:allowance", "thing:organization", "thing:person"]);
    for (const [key, hash] of Object.entries(depends)) expect(Compare.hashOf(model, key)).toBe(hash);
  });

  it("a plugin's operation depends on its mount, which hashOf answers, and the edges say what each mount provides and needs", () => {
    const mounted = edited((m) => {
      m.mounts = {
        echo: { kind: "feature", file: "blueprint/features/echo.ts", package: "@x/echo", version: "1.0.0", integrity: "sha256-a", chosen: {}, hash: "echohash" },
        greet: { kind: "feature", file: "blueprint/features/greet.ts", package: "@x/greet", version: "1.0.0", integrity: "sha256-b", chosen: {}, needs: ["feature:echo"], hash: "greethash" },
      };
      m.operations["echo.repeat"] = { ...m.operations["system.health"], name: "echo.repeat", thing: "system", from: { mount: "echo", package: "@x/echo", version: "1.0.0", thing: "echo" } };
    });
    expect(Compare.dependsOn(mounted, "echo.repeat")["feature:echo"]).toBe("echohash");
    expect(Compare.hashOf(mounted, "feature:echo")).toBe("echohash");
    expect(Compare.hashOf(mounted, "adapter:echo")).toBeUndefined();
    expect(Object.keys(Compare.dependsOn(mounted, "allowance.spend")).some((k) => k.startsWith("feature:"))).toBe(false);
    expect(Compare.edges(mounted)).toEqual(["feature:echo -> echo.repeat  provides", "feature:greet -> feature:echo  needs"]);
    expect(Compare.edges(model)).toEqual([]);
  });

  it("an operation that calls an adapter rests on its mount, and the edges say who uses it", () => {
    const calling = edited((m) => {
      m.mounts = { pricing: { kind: "adapter", file: "blueprint/adapters/pricing.ts", package: "@x/remote", version: "1.0.0", integrity: "sha256-a", chosen: {}, calls: ["quote"], hash: "pricinghash" } };
      m.operations["allowance.spend"] = { ...m.operations["allowance.spend"], steps: { price: { name: "allowance.spend.price", type: "call", call: { mount: "pricing", call: "quote", mode: "promise" } } } };
    });
    expect(Compare.dependsOn(calling, "allowance.spend")["adapter:pricing"]).toBe("pricinghash");
    expect(Compare.hashOf(calling, "adapter:pricing")).toBe("pricinghash");
    expect(Object.keys(Compare.dependsOn(calling, "allowance.grant"))).not.toContain("adapter:pricing");
    expect(Compare.edges(calling)).toEqual(["adapter:pricing -> allowance.spend  used-by"]);
  });
});
