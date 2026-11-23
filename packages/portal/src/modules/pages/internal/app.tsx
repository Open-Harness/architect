// The portal's client: a route is read from the path, the data from `/_portal/v1/*`, and the page is drawn once both are in.
import { Effect } from "effect";
import { useEffect, useState } from "react";
import type { Loaded, Route } from "../types.ts";
import { ComparePage, EnvironmentPage } from "./env.tsx";
import { Home } from "./home.tsx";
import { JourneysPage, WorldsPage } from "./journeys.tsx";
import { load } from "./load.ts";
import { AlertsPage, IssuesPage, MonitorPage } from "./monitor.tsx";
import { OperationPage } from "./operation.tsx";
import { Page } from "./parts.tsx";
import { PluginsPage } from "./plugins.tsx";
import { ReferencePage } from "./reference.tsx";
import { routeOf } from "./route.ts";
import { ThingPage } from "./thing.tsx";
import { TracePage } from "./trace.tsx";
import { environmentsOf } from "./model.ts";

const NotFound = () => <Page status={404}><h1>Not found</h1><p><a href="/portal">The portal</a></p></Page>;

const Drawn = ({ route, loaded }: { readonly route: Route; readonly loaded: Loaded }) => {
  if (loaded.state === "loading") return <Page status={200} ready={false}><p>Loading</p></Page>;
  if (loaded.state === "failed") {
    return <Page status={502}><h1>The portal could not read its data</h1><p className="banner">{`${loaded.failure.request}: ${loaded.failure.reason}. Nothing here is a proof.`}</p></Page>;
  }
  const { data } = loaded;
  const { model } = data.blueprint;
  switch (route.page) {
    case "home": return <Home data={data} />;
    case "thing": { const thing = model.things[route.name]; return thing === undefined ? <NotFound /> : <ThingPage data={data} thing={thing} />; }
    case "operation": { const op = model.operations[route.name]; return op === undefined ? <NotFound /> : <OperationPage data={data} op={op} tab={route.tab} />; }
    case "environment": { const env = environmentsOf(data.blueprint).find((e) => e.name === route.name); return env === undefined ? <NotFound /> : <EnvironmentPage data={data} env={env} />; }
    case "plugins": return <PluginsPage data={data} />;
    case "journeys": return <JourneysPage data={data} />;
    case "worlds": return <WorldsPage data={data} />;
    case "compare": return <ComparePage data={data} />;
    case "reference": return <ReferencePage data={data} kind={route.kind} />;
    case "trace": return <TracePage data={data} id={route.id} />;
    case "monitor": return <MonitorPage data={data} />;
    case "alerts": return <AlertsPage data={data} />;
    case "issues": return <IssuesPage data={data} />;
    case "missing": return <NotFound />;
  }
};

/** The whole client: the one component the browser entry mounts. */
export const App = ({ pathname, search = "" }: { readonly pathname: string; readonly search?: string }) => {
  const [loaded, setLoaded] = useState<Loaded>({ state: "loading" });
  useEffect(() => {
    let live = true;
    void Effect.runPromise(load().pipe(Effect.match({
      onSuccess: (data): Loaded => ({ state: "ready", data }),
      onFailure: (failure): Loaded => ({ state: "failed", failure }),
    }))).then((next) => { if (live) setLoaded(next); });
    return () => { live = false; };
  }, []);
  return <Drawn route={routeOf(pathname, search)} loaded={loaded} />;
};
