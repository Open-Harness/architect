import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { Evidence } from "./service.ts";
import type { Ports } from "./types.ts";
import type { ModelView } from "../refusal-evals/types.ts";

// Acme's captured outputs (`e2e/grid/fixtures/acme`), not its live ones.
const model = JSON.parse((JSON.parse(readFileSync(join(import.meta.dirname, "../../../fixtures/acme/files.json"), "utf8")) as Record<string, string>)["generated/model/model.json"]!) as ModelView;

describe("the evidence of a refusal", () => {
  it("asks each declaring operation's docs and portal page, the spans and the clients' outcomes, and nothing else", () => {
    const asked: Array<string> = [];
    const ports: Ports = {
      read: (path) => { asked.push(`read ${path}`); return Effect.succeed(`docs of ${path}`); },
      portal: (route) => { asked.push(`portal ${route}`); return Effect.succeed(undefined); },
      spans: () => { asked.push("spans"); return Effect.succeed([{ name: "x", attrs: {} }]); },
      observed: (refusal) => { asked.push(`observed ${refusal}`); return Effect.succeed({ cli: { status: 41, stdout: "", stderr: "line" } }); },
    };
    const evidence = Effect.runSync(Evidence.ofRefusal({ model, refusal: "AllowanceNotActive", ports }));
    expect(asked.sort()).toEqual([
      "observed AllowanceNotActive",
      "portal /portal/operations/allowance.revoke", "portal /portal/operations/allowance.spend",
      "read generated/docs/allowance/revoke.md", "read generated/docs/allowance/spend.md",
      "spans",
    ]);
    expect(evidence.docs).toEqual({ "allowance.revoke": "docs of generated/docs/allowance/revoke.md", "allowance.spend": "docs of generated/docs/allowance/spend.md" });
    expect(evidence.portal).toEqual({ "allowance.revoke": undefined, "allowance.spend": undefined });
    expect(evidence.cli).toEqual({ status: 41, stdout: "", stderr: "line" });
    expect(evidence.mcp).toBeUndefined();
    expect(evidence.spans).toEqual([{ name: "x", attrs: {} }]);
  });

  it("leaves what could not be observed undefined, so the eval is red and says so", () => {
    const ports: Ports = { read: () => Effect.succeed(undefined), portal: () => Effect.succeed(undefined), spans: () => Effect.succeed(undefined), observed: () => Effect.succeed(undefined) };
    const evidence = Effect.runSync(Evidence.ofRefusal({ model, refusal: "AllowanceExceeded", ports }));
    expect(evidence).toMatchObject({ docs: { "allowance.spend": undefined }, spans: undefined, cli: undefined, mcp: undefined });
  });
});
