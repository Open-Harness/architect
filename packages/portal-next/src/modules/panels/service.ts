import { TITLES, environmentsOf, thingsOf } from "./internal/names.ts";
import type { Loaded } from "../data/types.ts";
import type { ExtraSource, PanelPage, PanelsApi, SearchEntry } from "./types.ts";

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

const GROUPS: Readonly<Record<SearchEntry["kind"], string>> = { thing: "Things", operation: "Operations", journey: "Journeys", refusal: "Refusal codes", environment: "Environments", monitor: "Monitor" };

const extraSource: PanelsApi["extraSource"] = (store, links) => {
  let seen: Loaded | undefined;
  let rows: ReturnType<ExtraSource["read"]> = [];
  return {
    read: () => {
      const now = store.get();
      if (now !== seen) {
        seen = now;
        rows = now.state === "ready"
          ? searchIndex(links, now.data.blueprint).map((e) => ({ name: e.code === undefined ? e.name : `${e.name} ${e.code}`, group: GROUPS[e.kind], description: e.kind, allowed: [{ kind: "anyone" as const }], href: e.href }))
          : [];
      }
      return rows;
    },
    subscribe: store.subscribe,
  };
};

export const Panels: PanelsApi = { pages, searchIndex, extraSource };
