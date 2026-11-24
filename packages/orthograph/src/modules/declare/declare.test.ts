import { describe, expect, it } from "vitest";
import { Declares } from "./service.ts";
import { Things } from "#modules/things/service.js";
import { Values } from "#modules/values/service.js";

describe("declare", () => {
  it("keeps the thing and what is declared of it", () => {
    const Agent = Things.thing({ description: "An agent.", fields: { id: Values.id("agt") } });
    const declared = Declares.declare(Agent, { name: "coder" });
    expect(declared).toMatchObject({ kind: "declared", thing: Agent, values: { name: "coder" } });
  });
});
