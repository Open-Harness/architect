import { createElement } from "react";
import { EnvContext } from "./internal/context.ts";
import { Link } from "./internal/link.tsx";
import { Page } from "./internal/page.tsx";
import type { FrameApi } from "./types.ts";

export const Frame: FrameApi = {
  Provider: ({ env, children }) => createElement(EnvContext, { value: env }, children),
  Page,
  Link,
};
