import { Blueprint } from "orthograph";
import { describe, expect, it } from "vitest";
import { structOf } from "orthograph/server";
import { inputSchema } from "./internal/input.ts";

describe("a tool's input schema says how a whole number travels", () => {
  it("advertises the digit pattern of uint and of unsigned and signed money", () => {
    const usdc = Blueprint.asset.token({ symbol: "USDC", decimals: 6 });
    const payload = { n: Blueprint.uint(64), price: Blueprint.money(usdc), fee: Blueprint.money(usdc, { signed: true }), title: Blueprint.text({ max: 9 }) };
    const props = (inputSchema(structOf(payload), payload) as { properties: Record<string, { pattern?: string }> }).properties;
    expect(props["n"]?.pattern).toBe("^(0|[1-9][0-9]*)$");
    expect(props["price"]?.pattern).toBe("^(0|[1-9][0-9]*)$");
    expect(props["fee"]?.pattern).toBe("^(0|-?[1-9][0-9]*)$");
    expect(props["title"]?.pattern).toBeUndefined();
  });
});
