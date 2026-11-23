// generated/web: a primitive and its React parts for each operation, and the one file per framework that gives them the app's host.
import type { Model } from "@orthograph/compiler";
import { lines, pascal } from "#modules/names/service.js";
import type { RenderedFile } from "#modules/names/types.js";
import { renderPrimitive } from "./primitive.ts";
import { renderReact } from "./react.ts";

/** `generated/web/react.tsx` (K29 section 3.6): the provider a page wraps its app in once, and the hooks a piece and a page reach the host by. */
const provider = (name: string): RenderedFile => ({
  path: "generated/web/react.tsx",
  scaffold: false,
  content: lines(
    `// Generated from blueprint/projections/web.ts. Do not edit.`,
    `"use client";`,
    `import { createContext, useContext } from "react";`,
    `import { WebHost, type ActionFactory, type PieceWiring } from "@orthograph/web";`,
    "",
    `const HostContext = createContext<WebHost | null>(null);`,
    "",
    `/** Wrap the app once: \`<${pascal(name)}Host value={WebHost.make({ client: ${pascal(name)}.layer({ url }), ask })}>\`. */`,
    `export const ${pascal(name)}Host = HostContext;`,
    "",
    `const hostOf = () => useContext(HostContext) ?? WebHost.missing;`,
    "",
    `/** What a piece's root takes: the host and the callback that sends this action. */`,
    `export const usePieceHost = <Answer,>(options: ActionFactory<any, Answer>): PieceWiring<Answer> => hostOf().wire(options);`,
    "",
    `/** An action of the app, for a page's own component: approval is asked of the host's person, and a write tells the reads it concerns. */`,
    `export const useAction = <Args, Answer>(options: ActionFactory<Args, Answer>) => hostOf().action(options);`,
  ),
});

export const renderWeb = (model: Model, name: string): ReadonlyArray<RenderedFile> => [
  provider(name),
  ...Object.values(model.operations).flatMap((op) => [renderPrimitive(model, op), renderReact(op)]),
];
