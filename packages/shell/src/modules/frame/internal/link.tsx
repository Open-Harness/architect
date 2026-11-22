// The typed link: a real `a` with a real `href`, which the shell follows through the History API on a plain click, so a new tab, a copied
// address and a screen reader's list of links all still work.
import { createContext, useContext, type ComponentProps } from "react";

export const NavigateContext = createContext<(to: string) => void>(() => undefined);

export const Link = ({ href, onClick, ...rest }: ComponentProps<"a"> & { readonly href: string }) => {
  const navigate = useContext(NavigateContext);
  return (
    <a
      {...rest}
      href={href}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        navigate(href);
      }}
    />
  );
};
