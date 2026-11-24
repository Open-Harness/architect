// The top bar: the project, the environment this portal is and the others it can be asked about, and ⌘K. One portal per environment (design/portal.md,
// round 2, Q12): the picker links to each environment's page and marks the one this portal reads.
import { Live } from "../../live/service.ts";
import type { PortalData } from "../../data/types.ts";
import { useEnv } from "./context.ts";
import { Link } from "./link.tsx";
import { Search } from "./search.tsx";

export const TopBar = ({ data }: { readonly data: PortalData }) => {
  const { links } = useEnv();
  const env = Live.environmentOf(data);
  return (
    <header data-portal="top-bar" data-environment={env.name} data-window-ms={env.windowMs}>
      <Link href={links.home()} className="brand">{data.blueprint.project}</Link>
      <span data-portal="env-picker" role="group" aria-label="Environment">
        {Object.values(data.blueprint.model.environments ?? {}).map((e) => (
          <Link key={e.name} data-portal="env-option" data-environment={e.name} data-href={links.environment({ name: e.name })} data-current={String(e.name === env.name)} href={links.environment({ name: e.name })}>{e.name}</Link>
        ))}
      </span>
      <span className="window">{env.windowMs === "not yet" ? "no live window" : `last ${String(Math.round(Number(env.windowMs) / 60_000))} min`}</span>
      <Search data={data} />
    </header>
  );
};
