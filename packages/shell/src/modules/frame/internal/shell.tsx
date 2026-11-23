// The root: follows the address, matches it against the route table, and hands each part what it draws. The navigation, the breadcrumb and the
// palette are all read from the same match, so they cannot disagree about where the person is.
import { useMemo, useSyncExternalStore } from "react";
import { Navigation } from "../../navigation/service.ts";
import { Palette as PaletteIndex } from "../../palette/service.ts";
import { Router } from "../../router/service.ts";
import type { FrameProps } from "../types.ts";
import type { Crumb } from "./breadcrumb.tsx";
import { Layouts } from "./layouts.tsx";
import { NavigateContext } from "./link.tsx";
import { Page } from "./page.tsx";
import { Palette } from "./palette.tsx";

export const Shell = ({ props, history }: FrameProps) => {
  const path = useSyncExternalStore(history.subscribe, history.path, history.path);
  const router = useMemo(() => Router.make(props.routes, props.map.home), [props.routes, props.map.home]);
  const match = router.match(path);
  const params = match?.params ?? {};
  const layout = Navigation.layoutOf(props.navigation.layout);
  const groups = Navigation.derive(props.navigation, (page) => router.href(page, params), match);
  const crumbs: ReadonlyArray<Crumb> =
    match === undefined ? [] : router.chain(match.page).map((page) => ({ page, href: router.href(page, params), current: page === match.page }));
  const entries = PaletteIndex.visible(props.palette, props.caller, match?.page, props.roles);
  const palette = <Palette entries={entries} hrefOf={(page) => router.href(page, params)} onOperation={props.onOperation} trigger={layout !== "none"} />;
  return (
    <NavigateContext value={history.push}>
      <div data-shell="root" data-layout={layout}>
        <Layouts layout={layout} parts={{ groups, crumbs, slots: props.slots ?? {}, page: <Page match={match} pages={props.pages} />, palette }} />
      </div>
    </NavigateContext>
  );
};
