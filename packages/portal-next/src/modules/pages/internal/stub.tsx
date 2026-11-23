// A page the frame holds and a later slice fills: its heading and one line saying so. It carries the page hook and the frame like any page, so the
// rail, the search and the top bar work on it and a check can open it.
import { Frame } from "../../frame/service.ts";
import type { PortalData } from "../../data/types.ts";

export const Stub = ({ data, title, slice }: { readonly data: PortalData; readonly title: string; readonly slice: string }) => (
  <Frame.Page status={200} data={data}>
    <h1>{title}</h1>
    <p className="meta">{`Drawn by ${slice}.`}</p>
  </Frame.Page>
);
