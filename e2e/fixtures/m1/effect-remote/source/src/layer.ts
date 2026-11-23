// The services the adapter's calls need: provided to them and to nothing else.
import { Layer } from "effect";
import { RequiredSetting } from "./setting.js";

export const layer = Layer.succeed(RequiredSetting, { value: "configured-setting" });
