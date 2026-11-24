// The page's one root: `data-ready` says it has drawn from the data API, `data-status` is its own verdict (404 for a route that is not a page).
// With data it sits in the frame; a page with none (loading, a failure) has no frame, because it has nothing true to put in one.
import { IconRail } from "./icon-rail.tsx";
import { LiveRail } from "./live-rail.tsx";
import { TopBar } from "./top-bar.tsx";
import { Tree } from "./tree.tsx";
import type { PageProps } from "../types.ts";

export const Page = ({ status, ready = true, data, scope = "all", operations, children }: PageProps) => (
  <div data-portal="page" data-ready={ready ? "true" : "false"} data-status={String(status)}>
    {data === undefined ? children : (
      <div className="shell">
        <TopBar data={data} />
        <IconRail data={data} />
        <Tree data={data} />
        <div className="content">{children}</div>
        <LiveRail data={data} scope={scope} operations={operations} />
      </div>
    )}
  </div>
);
