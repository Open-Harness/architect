// A real `a` with a real `href`, followed through the shell's router on a plain click, so a new tab, a copied address and a screen reader's list
// of links all still work. Every `data-*` the caller gives lands on the element.
import type { ComponentProps } from "react";
import { useEnv } from "./context.ts";

export const Link = ({ href, onClick, target, ...rest }: ComponentProps<"a"> & { readonly href: string }) => {
  const { go } = useEnv();
  return (
    <a
      {...rest}
      href={href}
      target={target}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || (target !== undefined && target !== "_self")) return;
        event.preventDefault();
        go(href);
      }}
    />
  );
};
