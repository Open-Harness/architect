// The page body: one element per route, painted by the page's own function. An address no route matches is the shell's own 404, never a blank.
import { useLayoutEffect, useRef } from "react";
import type { Match } from "../../router/types.ts";
import type { PageFn } from "../types.ts";

export const Page = ({ match, pages }: { readonly match: Match | undefined; readonly pages: Readonly<Record<string, PageFn>> }) => {
  const ref = useRef<HTMLElement>(null);
  const paint = match === undefined ? undefined : pages[match.page];
  // The route as one string: the body is painted again when the page or any parameter changes, and not otherwise.
  const route = match === undefined ? "" : `${match.page}\n${JSON.stringify(match.params)}`;
  useLayoutEffect(() => {
    const el = ref.current;
    if (el === null || match === undefined || paint === undefined) return undefined;
    const done = paint(el, match.params);
    return () => {
      if (typeof done === "function") done();
      el.replaceChildren();
    };
    // `paint` and `match` are read through `route`, which holds them both.
  }, [route]);
  if (match === undefined) {
    return (
      <main key={route} data-shell="page" data-page="" data-status="404">
        <h1>Page not found</h1>
        <p>No page has this address.</p>
      </main>
    );
  }
  return <main key={route} ref={ref} data-shell="page" data-page={match.page} data-status="200" />;
};
