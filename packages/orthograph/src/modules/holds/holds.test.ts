import { describe, expect, it } from "vitest";
import { Holds } from "./service.ts";
import { Things } from "#modules/things/service.js";
import { Values } from "#modules/values/service.js";

const Switch = Things.thing({ description: "A switch.", fields: { id: Values.id("swi") } });

describe("holds", () => {
  it("a hold names its key and the states it is on in, and takes the app's two lists", () => {
    const hold = Holds.hold(Switch, { key: Switch.fields.id, while: [] });
    const lists = hold.holds({ held: [], unheld: [] });
    expect(lists).toMatchObject({ kind: "holds", hold });
    expect(hold.key).toBe(Switch.fields.id);
  });
});
