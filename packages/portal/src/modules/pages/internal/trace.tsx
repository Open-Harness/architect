// /portal/traces/<id>: one call's structure and timing, from `/_portal/v1/traces/<id>` (scrubbed on the server): the waterfall by attempt, each
// span's outcome, the declared refusal and how many logs it has. Never a payload, an answer, a statement, a person or a log body.
import { Effect } from "effect";
import { useEffect, useState } from "react";
import type { Availability } from "#modules/wire/types.js";
import type { TraceView } from "#modules/telemetry/types.js";
import type { DataFailed, PortalData } from "../types.ts";
import { loadTrace } from "./load.ts";
import { NotYet } from "./not-yet.tsx";
import { Page } from "./parts.tsx";

type Read =
  | { readonly state: "loading" }
  | { readonly state: "done"; readonly answer: Availability<TraceView> | { readonly state: "missing" } }
  | { readonly state: "failed"; readonly why: DataFailed };

export const TracePage = ({ data, id }: { readonly data: PortalData; readonly id: string }) => {
  const [read, setRead] = useState<Read>({ state: "loading" });
  useEffect(() => {
    let live = true;
    void Effect.runPromise(loadTrace(id).pipe(Effect.match({
      onSuccess: (answer): Read => ({ state: "done", answer }),
      onFailure: (why): Read => ({ state: "failed", why }),
    }))).then((next) => { if (live) setRead(next); });
    return () => { live = false; };
  }, [id]);
  if (read.state === "loading") return <Page status={200} ready={false} data={data}><p>Loading</p></Page>;
  // A request that failed is not a trace that is not there: it says what failed and draws no claim about the trace.
  if (read.state === "failed") return <Page status={502} data={data}><h1>{`Trace ${id}`}</h1><p className="banner">{`${read.why.request}: ${read.why.reason}.`}</p></Page>;
  if (read.answer.state === "missing") return <Page status={404} data={data}><h1>No such trace</h1><p>{`The portal's window holds no trace ${id}.`}</p></Page>;
  if (read.answer.state === "unavailable") return <Page status={200} data={data}><h1>{`Trace ${id}`}</h1><p><NotYet hole="trace" what={read.answer.reason} /></p></Page>;
  const { spans } = read.answer.value;
  return (
    <Page status={200} data={data}>
      <h1>{`Trace ${id}`}</h1>
      <p className="meta">Structure and timing only: a span's payload, answer, statement, person and logs are never drawn here; the logs are counted.</p>
      <table>
        <thead><tr><th>Span</th><th>Attempt</th><th>Start</th><th>ms</th><th>Outcome</th><th>Logs</th></tr></thead>
        <tbody>
          {spans.map((s) => (
            <tr key={s.span} data-portal="span-row" data-span-name={s.name} data-depth={String(s.depth)} {...(s.attempt === null ? {} : { "data-attempt": String(s.attempt) })} data-logs={String(s.logs)} data-outcome={s.outcome} {...(s.commit === null ? {} : { "data-commit": s.commit })}>
              <td style={{ paddingLeft: `${s.depth * 1.25}rem` }}>{s.name}</td>
              <td>{s.attempt ?? ""}</td><td>{s.start}</td><td>{s.ms}</td>
              <td>{`${s.refusal === null ? s.outcome : `${s.outcome} ${s.refusal}`}${s.commit === null ? "" : `, commit ${s.commit}`}`}</td><td>{s.logs}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Page>
  );
};
