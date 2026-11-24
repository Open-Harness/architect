import { describe, expect, it } from "vitest";
import { gate } from "./service.ts";
import type { Account, PolicyView, TriggerView } from "./types.ts";

const thread = { key: "C1:1.1" };
const ann: Account = { state: "listed", bot: false, external: "U1" };
const policy = (mode: PolicyView["mode"] = "observe"): PolicyView => ({ mode, bots: new Set(), admission: {} });
const say = (author: Account | null, addressed: TriggerView["addressed"]): TriggerView => ({ author, addressed, row: "C1", observed: true });

describe("the gate", () => {
  it("a listed person addressing the agent is explicit in every mode", () => {
    for (const mode of ["off", "observe", "auto"] as const) expect(gate.of(say(ann, "mention"), thread, [], policy(mode))).toEqual({ strength: "explicit", basis: "addressed" });
  });

  it("a listed person's plain message is inferred, and `off` makes it none", () => {
    expect(gate.of(say(ann, undefined), thread, [], policy())).toEqual({ strength: "inferred", basis: "admission" });
    expect(gate.of(say(ann, undefined), thread, [], policy("off")).strength).toBe("none");
  });

  it("a stranger, and a message with no sender, admit nothing by default", () => {
    expect(gate.of(say({ ...ann, state: "seen" }, "mention"), thread, [], policy()).strength).toBe("none");
    expect(gate.of(say(null, undefined), thread, [], policy()).strength).toBe("none");
  });
});
