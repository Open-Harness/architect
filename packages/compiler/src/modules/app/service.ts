import type { AppApi } from "./types.ts";
import { describeApp } from "./internal/describe.ts";
import { setAside } from "./internal/read.ts";

export const App: AppApi = { setAside, describe: describeApp };
