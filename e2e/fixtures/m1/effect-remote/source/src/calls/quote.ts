import { Effect } from "effect";
import { ForeignRejected, RequiredSetting } from "../setting.js";

export type Mode = "ok" | "fail" | "defect" | "interrupt";

export default (mode: Mode) =>
  Effect.gen(function* () {
    const setting = yield* RequiredSetting;
    if (mode === "fail") return yield* Effect.fail(new ForeignRejected({ marker: "foreign-private-canary" }));
    if (mode === "defect") return yield* Effect.die(new Error("foreign effect defect"));
    if (mode === "interrupt") return yield* Effect.interrupt;
    return { value: setting.value };
  });
