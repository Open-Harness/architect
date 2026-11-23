import { Context, Data } from "effect";

export class RequiredSetting extends Context.Service<RequiredSetting, { readonly value: string }>()("fixture/RequiredSetting") {}
export class ForeignRejected extends Data.TaggedError("ForeignRejected")<{ readonly marker: string }> {}
