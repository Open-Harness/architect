// A slot's region: drawn always, empty unless something fills it. A feature fills it with a function that paints into the element (and may return
// the way to take its work down); the shell puts nothing of its own there but the navigation, which is its own slot.
import { useLayoutEffect, useRef, type ReactNode } from "react";
import type { SlotFn } from "../types.ts";

export const Slot = ({ name, fill, children }: { readonly name: string; readonly fill?: SlotFn | undefined; readonly children?: ReactNode }) => {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (el === null || fill === undefined) return undefined;
    const done = fill(el);
    return () => {
      if (typeof done === "function") done();
      el.replaceChildren();
    };
  }, [fill]);
  return (
    <div data-shell="slot" data-shell-slot={name} ref={ref}>
      {children}
    </div>
  );
};
