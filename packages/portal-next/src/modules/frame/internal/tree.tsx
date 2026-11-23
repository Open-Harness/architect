// The things tree: the app's own things in the model's order, each folding to its operations. A thing's machine, events and errors are sections of
// its page, not rows here. In UI SDK's `scroll-area`, so a long tree scrolls on its own.
import { ScrollArea, ScrollAreaContent, ScrollAreaScrollbar, ScrollAreaThumb, ScrollAreaViewport } from "@ui-sdk/react/scroll-area";
import type { PortalData } from "../../data/types.ts";
import { useEnv } from "./context.ts";
import { Link } from "./link.tsx";

export const Tree = ({ data }: { readonly data: PortalData }) => {
  const { links } = useEnv();
  const { things, operations } = data.blueprint.model;
  return (
    <aside data-portal="tree" aria-label="Things">
      <ScrollArea aria-label="Things tree">
        <ScrollAreaViewport>
          <ScrollAreaContent>
            {Object.values(things).map((t) => (
              <div key={t.name} className="tree-thing">
                <Link data-portal="tree-item" data-kind="thing" data-name={t.name} href={links.thing({ name: t.name })}>{t.name}</Link>
                {Object.values(operations).filter((o) => o.thing === t.name).map((o) => (
                  <Link key={o.name} data-portal="tree-item" data-kind="operation" data-name={o.name} className="sub" href={links.operation({ name: o.name })}>{o.verb}</Link>
                ))}
              </div>
            ))}
          </ScrollAreaContent>
        </ScrollAreaViewport>
        <ScrollAreaScrollbar orientation="vertical"><ScrollAreaThumb /></ScrollAreaScrollbar>
      </ScrollArea>
    </aside>
  );
};
