// The allowance.grant trace prove recorded and Tempo gave back, built up span by span (the `trace-waterfall` skill).
// Data: spikes/local-trace-viewer/evidence/allowance-grant.tempo-trace.json, times in ms from the trace's start.
// workerd's clock only moves on I/O, so its times come in whole milliseconds and some spans read 0 ms.
import { waterfall } from "/lib/kinds/waterfall.js";

export default waterfall({
  title: "One trace, span by span",
  subtitle: "allowance.grant · recorded by prove, read back from Tempo",
  unit: "ms",
  intro: "allowance.grant, one call, as prove recorded it",
  outro: "no span ends as an error; the move and its event are written on the operation's span",
  spans: [
    { name: "POST /allowance/grant", depth: 0, start: 0, end: 5, color: "accent", say: "the request's span opens: POST /allowance/grant" },
    { name: "sqlite · SELECT organization", depth: 1, start: 3, end: 3, color: "muted", say: "the role check reads the organization, before the operation's span opens" },
    { name: "allowance.grant", depth: 1, start: 3, end: 5, color: "step", say: "the operation's own span: allowance.grant" },
    { name: "allowance.grant.insert", depth: 2, start: 3, end: 3, color: "step", say: "its declared step, allowance.grant.insert, holds the insert back for the commit" },
    { name: "sqlite · SELECT allowance", depth: 2, start: 3, end: 4, color: "muted", say: "a read of the allowance, inside the operation" },
    { name: "BATCH · allowance + _journal", depth: 2, start: 4, end: 5, color: "journal", say: "the commit: the allowance row and its journal row, in one batch" },
  ],
  attrs: {
    on: "allowance.grant",
    items: [
      { text: "operation=allowance.grant", color: "step" },
      { text: "move.name=grant", color: "step" },
      { text: "move.to=active", color: "step" },
      { text: "event.name=AllowanceGranted", color: "journal" },
      { text: "payload.limit=500", color: "journal" },
    ],
  },
  footnote: "workerd's clock moves only on I/O: times come in whole ms",
});
