import { describe, expect, it } from "vitest";
import { Agents } from "./service.ts";
import { Things } from "#modules/things/service.js";
import { Values } from "#modules/values/service.js";

const Pool = Things.thing({ description: "A pool.", fields: { id: Values.id("pol"), size: Values.uint(8) } });
const Seat = Things.thing({ description: "A seat.", fields: { id: Values.id("sea") } });

describe("agents", () => {
  it("a kind that holds a seat says where its size is and what holds it", () => {
    const executor = Agents.agent({ model: "small", slots: { size: Pool.fields.size, reserve: 1, held: Seat } });
    expect(executor.kind).toBe("agent");
    expect(executor.slots).toMatchObject({ reserve: 1, held: Seat });
  });

  it("a kind with no seat has no slots", () => {
    expect(Agents.agent({ model: "small" }).slots).toBeUndefined();
  });
});
