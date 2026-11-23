// /portal/plugins: a card per mount (kind, package, version), then the stores table with what each store runs on in each environment.
// Plugged In declares no store: the convention is one `default` store, bound per environment to the database that environment runs on.
import { Card } from "@orthograph/portal-ui";
import type { PortalData } from "../types.ts";
import { environmentsOf, mountsOf } from "./model.ts";
import { Page } from "./parts.tsx";

export const PluginsPage = ({ data }: { readonly data: PortalData }) => {
  const mounts = mountsOf(data.blueprint);
  const envs = environmentsOf(data.blueprint);
  return (
    <Page status={200} data={data}>
      <h1>Plugins and stores</h1>
      <h2>Plugins</h2>
      <p>What the blueprint mounts: each is a package at a version, and the file that mounts it.</p>
      <ul className="things">
        {mounts.map(([name, m]) => (
          <li key={name}>
            <Card data-portal="plugin-card" data-plugin={name} data-kind={m.kind} data-package={m.package} data-version={m.version}>
              <Card.Content><Card.Title>{name}</Card.Title><Card.Description>{`${m.kind} from ${m.package} ${m.version}, mounted in ${m.file}`}</Card.Description></Card.Content>
            </Card>
          </li>
        ))}
      </ul>
      <h2>Stores</h2>
      <p>Where the data lives, and what each environment runs it on.</p>
      <table>
        <thead><tr><th>Store</th><th>Kind</th>{envs.map((e) => <th key={e.name}>{e.name}</th>)}</tr></thead>
        <tbody>
          <tr data-portal="store-row" data-store="default" data-kind="database">
            <td>default</td><td>database</td>
            {envs.map((e) => {
              const runsOn = e.database ?? (typeof e.cloud?.["database"] === "string" ? e.cloud["database"] : "none");
              return <td key={e.name} data-portal="store-binding" data-store="default" data-environment={e.name} data-runs-on={runsOn}>{runsOn}</td>;
            })}
          </tr>
        </tbody>
      </table>
    </Page>
  );
};
