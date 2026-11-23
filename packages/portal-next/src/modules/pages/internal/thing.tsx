// `/portal/things/:name`: opens on the lifecycle, and the live rail is scoped to the thing's operations. Its operations table, rules, events and
// errors are slice 7's.
import { Frame } from "../../frame/service.ts";
import type { PortalData } from "../../data/types.ts";
import { NotFound } from "./draw.tsx";
import { Lifecycle } from "./lifecycle.tsx";

export const ThingPage = ({ data, name }: { readonly data: PortalData; readonly name: string }) => {
  const thing = data.blueprint.model.things[name];
  if (thing === undefined) return <NotFound what={`The thing ${name}`} data={data} />;
  const operations = Object.values(data.blueprint.model.operations).filter((o) => o.thing === thing.name).map((o) => o.name);
  return (
    <Frame.Page status={200} data={data} scope={`thing:${thing.name}`} operations={operations}>
      <h1>{thing.name}</h1>
      <p>{thing.description}</p>
      <Lifecycle thing={thing} />
    </Frame.Page>
  );
};
