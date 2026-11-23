import { Effect } from "effect";
import { emptyServer, renderHandlerScaffold } from "@orthograph/projections/shared";
import { PortalRender } from "#modules/portal/service.js";
import type { RenderApi } from "./types.ts";
import { renderDocs } from "./internal/docs.ts";
import { filesOf, mountedIn } from "./internal/mounted.ts";

export const Render: RenderApi = {
  files: ({ name, model, root }) =>
    Effect.gen(function* () {
      // What a mount makes is what a projection renders from it: the model, the api, the server, the sdk, the cli and the mcp are mounted (M1.11, M1.12).
      const mounted = yield* mountedIn(root, model);
      const made = yield* Effect.forEach(mounted, (m) => filesOf(name, model, m));
      const docs = renderDocs(model, name);
      return [
        ...made.flat(),
        ...docs,
        ...PortalRender.files({ name, model, docs }),
        // A plugin's handlers are in its package: the project's src/ gains nothing for them (M1-plugins section 8).
        ...Object.values(model.operations).filter((op) => op.kind === "operation" && op.from.kind === "app").map((op) => renderHandlerScaffold(op, undefined, model)),
      ];
    }),
  emptyServer: ({ name, model }) => emptyServer(model, name),
};
