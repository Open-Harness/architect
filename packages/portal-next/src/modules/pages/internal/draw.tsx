// What every page does the same way: read the store, say `loading` until the data is in, say why when it could not be read, and otherwise hand the
// data to the page's body. A failure is the page's own 502, never a blank and never a number it could not read.
import { useSyncExternalStore, type ReactNode } from "react";
import type { Params } from "@orthograph/shell";
import { Frame } from "../../frame/service.ts";
import type { FrameEnv } from "../../frame/types.ts";
import type { PortalData, Store } from "../../data/types.ts";

/** A page's body: what is drawn from the data, for the route's parameters. It draws its own frame through `Frame.Page`. */
export type Body = (data: PortalData, params: Params, search: URLSearchParams) => ReactNode;

export const Drawn = ({ store, env, params, search = new URLSearchParams(), body }: { readonly store: Store; readonly env: FrameEnv; readonly params: Params; readonly search?: URLSearchParams; readonly body: Body }) => {
  const loaded = useSyncExternalStore(store.subscribe, store.get, store.get);
  return (
    <Frame.Provider env={env}>
      {loaded.state === "loading" ? <Frame.Page status={200} ready={false}><p>Loading</p></Frame.Page>
        : loaded.state === "failed" ? (
          <Frame.Page status={502}>
            <h1>The portal could not read its data</h1>
            <p className="banner">{`${loaded.failure.request}: ${loaded.failure.reason}. Nothing here is a proof.`}</p>
          </Frame.Page>
        ) : body(loaded.data, params, search)}
    </Frame.Provider>
  );
};

/** A route that names something the blueprint does not declare is not a page. */
export const NotFound = ({ what, data }: { readonly what: string; readonly data?: PortalData }) => (
  <Frame.Page status={404} data={data}>
    <h1>Not found</h1>
    <p>{`${what} is not a page of this portal.`}</p>
  </Frame.Page>
);
