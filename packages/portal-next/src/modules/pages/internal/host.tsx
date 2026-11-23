// A page is painted into the element the shell gives it, but React's root gets a child container of its own. The shell's cleanup calls the disposer
// and then empties the element (`replaceChildren`), so a root mounted on the element itself would later find its nodes gone and throw on unmount.
// With a container React owns, the shell only ever removes the container; the unmount waits a microtask, since React will not unmount a root
// synchronously inside the shell's commit.
import { createRoot } from "react-dom/client";
import type { PageFn } from "@orthograph/shell";
import { Drawn, type Body } from "./draw.tsx";
import type { PagesDeps } from "../types.ts";

export const painter = ({ store, env }: PagesDeps, body: Body): PageFn => (el, params, search) => {
  const container = el.ownerDocument.createElement("div");
  container.style.display = "contents";
  el.appendChild(container);
  const root = createRoot(container);
  root.render(<Drawn store={store} env={env} params={params} search={search} body={body} />);
  return () => { queueMicrotask(() => { root.unmount(); }); };
};
