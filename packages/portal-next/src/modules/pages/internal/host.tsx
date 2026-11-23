// A page is painted into the element the shell gives it: one React root for it, taken down when the page is left. The shell calls the cleanup inside
// its own commit, where React will not unmount a root synchronously, so the unmount waits a microtask.
import { createRoot } from "react-dom/client";
import type { PageFn } from "@orthograph/shell";
import { Drawn, type Body } from "./draw.tsx";
import type { PagesDeps } from "../types.ts";

export const painter = ({ store, env }: PagesDeps, body: Body): PageFn => (el, params, search) => {
  const root = createRoot(el);
  root.render(<Drawn store={store} env={env} params={params} search={search} body={body} />);
  return () => { queueMicrotask(() => { root.unmount(); }); };
};
