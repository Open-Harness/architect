// /portal/journeys and /portal/starting-worlds: what the model declares, never what a trace holds. A journey is drawn with its declared steps;
// a blueprint that declares none says so and draws nothing. Step verdicts are not on the wire yet (PRJ-47) and say `not yet`.
import type { PortalData } from "../types.ts";
import { journeysOf, worldsOf } from "./model.ts";
import { NotYet } from "./not-yet.tsx";
import { Page } from "./parts.tsx";

export const JourneysPage = ({ data }: { readonly data: PortalData }) => {
  const journeys = journeysOf(data.blueprint);
  return (
    <Page status={200} data={data}>
      <h1>Journeys</h1>
      <p>Each journey is a story a person or an agent runs against the blueprint; its steps are the ones it declares.</p>
      {journeys.length === 0 ? <p data-portal="journeys-empty">This blueprint declares no journey.</p> : null}
      {journeys.map((j) => (
        <section key={j.file} data-portal="journey" data-name={j.name} data-starts={j.starts ?? ""}>
          <h2>{j.name}</h2>
          <p className="meta">{`Cast: ${Object.keys(j.cast).join(", ") || "none"}. Starts in: ${j.starts ?? "an empty world"}.`}</p>
          <ol>
            {j.steps.map((s, i) => (
              "call" in s ? (
                <li key={i} data-portal="journey-step" data-title={s.title} data-operation={s.call.operation}>
                  {`${s.title} (${s.call.actor} calls ${s.call.operation}) `}
                  <NotYet hole="step-verdict" what="step verdicts are not on the wire yet" />
                </li>
              ) : (
                <li key={i} data-portal="journey-step" data-title={s.title} data-skipped={s.skipped}>{`${s.title}: skipped, ${s.skipped}`}</li>
              )
            ))}
          </ol>
        </section>
      ))}
    </Page>
  );
};

export const WorldsPage = ({ data }: { readonly data: PortalData }) => {
  const worlds = worldsOf(data.blueprint);
  return (
    <Page status={200} data={data}>
      <h1>Starting worlds</h1>
      <p>The worlds a journey can start in: what each makes before the journey's first step.</p>
      {worlds.length === 0 ? <p>This blueprint declares no starting world.</p> : null}
      <ul>
        {worlds.map((w) => (
          <li key={w.file} data-portal="world" data-name={w.name}>{`${w.name}${w.from === null ? "" : `, from ${w.from}`}: makes ${w.makes.length} calls`}</li>
        ))}
      </ul>
    </Page>
  );
};
