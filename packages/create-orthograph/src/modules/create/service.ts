import { Effect } from "effect";
import { App } from "@orthograph/preset";
import type { CreateApi } from "./types.ts";
import { USAGE } from "./internal/usage.ts";

const run: CreateApi["run"] = ({ args, parent }) =>
  args.includes("--help") || args.includes("-h")
    ? Effect.succeed(USAGE)
    : App.nameIn(args).pipe(Effect.flatMap((name) => App.create({ parent, name })));

export const Create: CreateApi = { run };
