// The navigation, on UI SDK's own parts: a `navigation-menu` named Main inside a `scroll-area` named Navigation, each group a `collapsible`
// (trigger and panel, not kept mounted, so a closed group has no links in the page or for an agent). A page that is a link on this route is a
// `NavigationMenuItem` whose `value` is the page's name, so an agent can address it; a page that is not is drawn, disabled, and is no item.
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "@ui-sdk/react/collapsible";
import { NavigationMenu, NavigationMenuItem, NavigationMenuLink, NavigationMenuList } from "@ui-sdk/react/navigation-menu";
import { ScrollArea, ScrollAreaContent, ScrollAreaScrollbar, ScrollAreaThumb, ScrollAreaViewport } from "@ui-sdk/react/scroll-area";
import type { ComponentProps } from "react";
import type { NavGroup, NavItem } from "../../navigation/types.ts";
import { Link } from "./link.tsx";

// The menu marks the current link with a bare `data-current`; the shell's hook says `true` or `false` on every item, so a selector can ask either.
const NavLink = ({ "data-current": current, ...rest }: ComponentProps<typeof Link> & { readonly "data-current"?: string }) => <Link {...rest} data-current={String(current !== undefined)} />;

const Item = ({ item }: { readonly item: NavItem }) => {
  if (item.href === undefined) {
    return (
      <li>
        <span data-shell="nav-item" data-page={item.page} data-current="false" aria-disabled="true">{item.page}</span>
      </li>
    );
  }
  return (
    <NavigationMenuItem value={item.page}>
      <NavigationMenuLink data-shell="nav-item" data-page={item.page} render={<NavLink href={item.href} />} current={item.current}>
        {item.page}
      </NavigationMenuLink>
    </NavigationMenuItem>
  );
};

const Group = ({ group }: { readonly group: NavGroup }) => (
  <Collapsible defaultOpen={!group.folded} data-shell="nav-group" data-title={group.title} data-folded={String(group.folded)}>
    <CollapsibleTrigger>{group.title}</CollapsibleTrigger>
    <CollapsiblePanel>
      <NavigationMenuList>
        {group.items.map((item) => (
          <Item key={item.page} item={item} />
        ))}
      </NavigationMenuList>
    </CollapsiblePanel>
  </Collapsible>
);

export const Nav = ({ groups, orientation }: { readonly groups: ReadonlyArray<NavGroup>; readonly orientation: "vertical" | "horizontal" }) => (
  <ScrollArea aria-label="Navigation">
    <ScrollAreaViewport>
      <ScrollAreaContent>
        <NavigationMenu aria-label="Main" orientation={orientation} data-shell="nav">
          {groups.map((group) => (
            <Group key={group.title} group={group} />
          ))}
        </NavigationMenu>
      </ScrollAreaContent>
    </ScrollAreaViewport>
    <ScrollAreaScrollbar orientation={orientation === "vertical" ? "vertical" : "horizontal"}>
      <ScrollAreaThumb />
    </ScrollAreaScrollbar>
  </ScrollArea>
);
