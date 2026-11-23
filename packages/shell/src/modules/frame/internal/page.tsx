// The page body: one element per route, painted by the page's own function. An address no route matches is the shell's own 404, never a blank:
// its text, or what the app paints in its place (`notFound`), in an element that keeps the shell's hooks either way.
import { useLayoutEffect, useRef } from "react";
import type { Match } from "../../router/types.ts";
import type { NotFoundFn, PageFn } from "../types.ts";

export interface PageProps {
  readonly match: Match | undefined;
  readonly pages: Readonly<Record<string, PageFn>>;
  readonly notFound: NotFoundFn | undefined;
  /** The address: the pathname, and the query as the browser has it. */
  readonly path: string;
  readonly search: string;
}

export const Page = ({ match, pages, notFound, path, search }: PageProps) => {
  const ref = useRef<HTMLElement>(null);
  const paint = match === undefined ? notFound : pages[match.page];
  const params = match?.params ?? {};
  // The route as one string: the body is painted again when the page, a parameter or the query changes (an unmatched address, when it changes), and not otherwise.
  const route = match === undefined ? `404\n${path}\n${search}` : `${match.page}\n${JSON.stringify(match.params)}\n${search}`;
  useLayoutEffect(() => {
    const el = ref.current;
    if (el === null || paint === undefined) return undefined;
    const done = paint(el, params, new URLSearchParams(search));
    return () => {
      if (typeof done === "function") done();
      el.replaceChildren();
    };
    // `paint`, `params` and `search` are read through `route`, which holds them all.
  }, [route]);
  if (match === undefined) {
    return (
      <main key={route} ref={ref} data-shell="page" data-page="" data-status="404">
        {notFound === undefined ? (
          <>
            <h1>Page not found</h1>
            <p>No page has this address.</p>
          </>
        ) : null}
      </main>
    );
  }
  return <main key={route} ref={ref} data-shell="page" data-page={match.page} data-status="200" />;
};
