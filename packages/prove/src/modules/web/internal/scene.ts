// The page a call is replayed in: one scene for each operation, a small module that mounts the operation's generated piece on the app's host
// (`generated/web/<thing>/<verb>.react.tsx` and `react.tsx`) and does nothing else. It is bundled from the project, so a piece the project
// changed or broke is what runs. The names are those the web projection writes.
import { join } from "node:path";
import { Effect } from "effect";
import { build } from "esbuild";
import type { Model } from "@orthograph/compiler";
import { WebUnavailable } from "../types.ts";

const pascal = (name: string) => name.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join("");
export const labelOf = (key: string) => key.charAt(0).toUpperCase() + key.slice(1);

/** What a person does to the piece of an operation: read it, fill in its form, or confirm through its dialog. */
export interface Plan {
  readonly kind: "read" | "form" | "confirm";
  readonly thing: string;
  readonly verb: string;
  readonly piece: string;
  /** The payload fields a person types, in order (a form and a confirmation). */
  readonly inputs: ReadonlyArray<string>;
  /** The payload fields the page gives the piece as props: every field of a read, the ids of a move. */
  readonly given: ReadonlyArray<string>;
}

/** The kind is told as the web projection tells it (K29 section 3): no `move` and only `load` steps is a read; `needsApproval` is a dialog. */
export const planOf = (model: Model, operation: string): Plan | undefined => {
  const op = model.operations[operation];
  if (op === undefined) return undefined;
  const fields = Object.entries(op.payload);
  const read = !op.move && Object.keys(op.steps).every((step) => step === "load");
  const ids = fields.filter(([, f]) => f.value.type === "id").map(([key]) => key);
  return {
    kind: read ? "read" : op.needsApproval === true ? "confirm" : "form",
    thing: op.thing,
    verb: op.verb,
    piece: `${pascal(op.thing)}${pascal(op.verb)}`,
    inputs: read ? [] : fields.filter(([key]) => !ids.includes(key)).map(([key]) => key),
    given: read ? fields.map(([key]) => key) : ids,
  };
};

const VIEW = { read: `<Piece.Root {...props}>{() => null}</Piece.Root>`, form: `<Piece.Form {...props} />`, confirm: `<Piece.Confirm {...props} />` } as const;

export const sceneSource = (root: string, name: string, plan: Plan): string => `
import "@ui-sdk/core/web.css";
import { createRoot } from "react-dom/client";
import { WebHost } from "@orthograph/web";
import * as Sdk from ${JSON.stringify(join(root, "generated/sdk/src/index.ts"))};
import { ${pascal(name)}Host as Provider } from ${JSON.stringify(join(root, "generated/web/react.tsx"))};
import { ${plan.piece} as Piece } from ${JSON.stringify(join(root, `generated/web/${plan.thing}/${plan.verb}.react.tsx`))};

const prove = (window as any).__prove as { token?: string; props: Record<string, string>; ready?: boolean };
const { props } = prove;
const host = WebHost.make({
  client: Sdk.layer({ url: location.origin, ...(prove.token ? { credential: Sdk.Credential.session(prove.token) } : {}) }),
  ask: () => Promise.resolve(false),
});
createRoot(document.getElementById("root")!).render(<Provider value={host}>${VIEW[plan.kind]}</Provider>);
requestAnimationFrame(() => { prove.ready = true; });
`;

export interface Bundle {
  readonly js: string;
  readonly css: string;
}

/** The scene bundled for the browser, resolved from the project (its React, its UI SDK, its `@orthograph/web`). */
export const bundle = (root: string, source: string): Effect.Effect<Bundle, WebUnavailable> =>
  Effect.tryPromise({
    try: () =>
      build({
        stdin: { contents: source, resolveDir: root, loader: "tsx", sourcefile: "scene.tsx" },
        bundle: true, minify: true, format: "esm", outdir: "scene", write: false, jsx: "automatic", target: "es2023", logLevel: "silent", loader: { ".css": "css" },
      }),
    catch: (cause) => new WebUnavailable({ message: `the pieces would not bundle for the browser: ${cause instanceof Error ? cause.message : String(cause)}` }),
  }).pipe(
    Effect.map(({ outputFiles }) => ({ js: outputFiles.find((f) => f.path.endsWith(".js"))?.text ?? "", css: outputFiles.find((f) => f.path.endsWith(".css"))?.text ?? "" })),
  );

export const PAGE = (): string => `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>ortho prove --through web</title><link rel="stylesheet" href="/__prove/scene.css"></head><body><main id="root"></main><script type="module" src="/__prove/scene.js"></script></body></html>\n`;
