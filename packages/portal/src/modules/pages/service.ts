import { App } from "./internal/app.tsx";
import { load } from "./internal/load.ts";
import { routeOf } from "./internal/route.ts";
import type { PagesApi } from "./types.ts";

export const Pages: PagesApi = { App, routeOf, load };
