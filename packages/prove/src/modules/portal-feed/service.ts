import { Clock, Effect } from "effect";
import type { PortalFeedApi } from "./types.ts";
import { close, listen } from "./internal/listen.ts";

export const PortalFeed: PortalFeedApi = {
  // The feed holds its source from the moment it is served (a world's collector is made just before): that moment is where its history starts.
  serve: (options) =>
    (options.now ?? Clock.currentTimeMillis).pipe(
      Effect.flatMap((startedAt) => Effect.acquireRelease(listen(options, startedAt), close)),
      Effect.map(({ url }) => ({ url })),
    ),
};
