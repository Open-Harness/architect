// `/portal`: the things as cards in the tree's order, each with its description, its lifecycle and what the window counted of it. The operations
// matrix under the cards, and what is stale and why, are slice 7's.
import { Frame } from "../../frame/service.ts";
import { Live } from "../../live/service.ts";
import type { PortalData } from "../../data/types.ts";
import type { FrameEnv } from "../../frame/types.ts";
import { Lifecycle } from "./lifecycle.tsx";

export const Home = ({ data, env }: { readonly data: PortalData; readonly env: FrameEnv }) => {
  const { blueprint } = data;
  return (
    <Frame.Page status={200} data={data} scope="all">
      <h1>{blueprint.project}</h1>
      <h2>Things</h2>
      <ul className="things">
        {Object.values(blueprint.model.things).map((thing) => {
          const ops = Object.values(blueprint.model.operations).filter((o) => o.thing === thing.name).map((o) => o.name);
          const t = Live.tallyOf(data, ops);
          return (
            <li key={thing.name} data-portal="thing-card" data-thing={thing.name} data-calls={t.calls} data-refused={t.refused} data-defects={t.defects}>
              <h3><Frame.Link href={env.links.thing({ name: thing.name })}>{thing.name}</Frame.Link></h3>
              <p>{thing.description}</p>
              <Lifecycle thing={thing} />
              <p className="meta">{`calls ${t.calls}, refused ${t.refused}, defects ${t.defects}`}</p>
            </li>
          );
        })}
      </ul>
    </Frame.Page>
  );
};
