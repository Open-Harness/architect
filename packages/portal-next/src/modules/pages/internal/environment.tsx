// `/portal/environments/:name`: one page per declared environment. One portal reads one environment's own sink (design/portal.md, round 2, Q12), so the
// page says whether this portal is that environment or another's. Its summary, declared fields and proof matrix are slice 8's.
import { Frame } from "../../frame/service.ts";
import { Live } from "../../live/service.ts";
import type { PortalData } from "../../data/types.ts";
import { NotFound } from "./draw.tsx";

export const EnvironmentPage = ({ data, name }: { readonly data: PortalData; readonly name: string }) => {
  const env = Object.values(data.blueprint.model.environments ?? {}).find((e) => e.name === name);
  if (env === undefined) return <NotFound what={`The environment ${name}`} />;
  const here = Live.environmentOf(data).name;
  const live = env.name === here;
  return (
    <Frame.Page status={200} data={data}>
      <div data-portal="env-page" data-environment={env.name} data-live={String(live)}>
        <h1>{env.name}</h1>
        <p>{live ? "This portal reads this environment." : `${env.name} is read in its own portal: this one reads ${here}.`}</p>
      </div>
    </Frame.Page>
  );
};
