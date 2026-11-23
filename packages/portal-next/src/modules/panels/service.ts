import { TITLES, environmentsOf, thingsOf } from "./internal/names.ts";
import type { PanelPage, PanelsApi, SearchEntry } from "./types.ts";

const pages: PanelsApi["pages"] = (navigation, links, blueprint) =>
  navigation.groups.flatMap((group): ReadonlyArray<PanelPage> =>
    group.pages.flatMap((page): ReadonlyArray<PanelPage> => {
      if (page.page === "thing") return thingsOf(blueprint).map((name) => ({ panel: group.title, title: name, href: links.thing({ name }) }));
      if (page.page === "environment") return environmentsOf(blueprint).map((name) => ({ panel: group.title, title: name, href: links.environment({ name }) }));
      return [{ panel: group.title, title: TITLES[page.page] ?? page.page, href: page.path }];
    }));

const searchIndex: PanelsApi["searchIndex"] = (links, blueprint): ReadonlyArray<SearchEntry> => [
  ...thingsOf(blueprint).map((name) => ({ kind: "thing" as const, name, href: links.thing({ name }) })),
  ...Object.keys(blueprint.model.operations).map((name) => ({ kind: "operation" as const, name, href: links.operation({ name }) })),
  ...Object.values(blueprint.model.journeys ?? {}).map((j) => ({ kind: "journey" as const, name: j.name, href: links.journeys() })),
  ...Object.entries(blueprint.model.refusals ?? {}).map(([name, code]) => ({ kind: "refusal" as const, name, code, href: links.refusals() })),
  ...environmentsOf(blueprint).map((name) => ({ kind: "environment" as const, name, href: links.environment({ name }) })),
  { kind: "monitor", name: "Monitor", href: links.monitor() },
];

export const Panels: PanelsApi = { pages, searchIndex };
