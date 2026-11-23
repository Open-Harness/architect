import { createElement } from "react";
import { painter } from "./internal/host.tsx";
import { EnvironmentPage } from "./internal/environment.tsx";
import { Home } from "./internal/home.tsx";
import { NotFound } from "./internal/draw.tsx";
import { OperationPage } from "./internal/operation.tsx";
import { Stub } from "./internal/stub.tsx";
import { ThingPage } from "./internal/thing.tsx";
import type { PagesApi } from "./types.ts";

/** The pages beyond the frame: their titles, and the slice that draws them (design/goals/06-portal.md). */
const LATER: ReadonlyArray<readonly [page: string, title: string, slice: string]> = [
  ["compare", "Compare environments", "slice 8"],
  ["journeys", "Journeys", "slice 8"],
  ["worlds", "Starting worlds", "slice 8"],
  ["access", "Access", "slice 9"],
  ["refusals", "Refusal codes", "slice 9"],
  ["events", "Events", "slice 9"],
  ["values", "Values", "slice 9"],
  ["machines", "Machines", "slice 9"],
  ["plugins", "Plugins and stores", "slice 9"],
  ["monitor", "Monitor", "slice 10"],
  ["trace", "Trace", "slice 10"],
];

const painters: PagesApi["painters"] = (deps) => ({
  home: painter(deps, (data) => createElement(Home, { data, env: deps.env })),
  thing: painter(deps, (data, params) => createElement(ThingPage, { data, name: params["name"] ?? "" })),
  operation: painter(deps, (data, params) => createElement(OperationPage, { data, name: params["name"] ?? "" })),
  environment: painter(deps, (data, params) => createElement(EnvironmentPage, { data, name: params["name"] ?? "" })),
  ...Object.fromEntries(LATER.map(([page, title, slice]) => [page, painter(deps, (data) => createElement(Stub, { data, title, slice }))])),
});

/** The 404 for an address no route of the map matches: the page's own hook and the frame, with the shell's element around it. */
const notFound: PagesApi["notFound"] = (deps) => painter(deps, (data) => createElement(NotFound, { data, what: "This address" }));

export const Pages: PagesApi = { painters, notFound };
