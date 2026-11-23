import { Reading } from "../../reading/service.ts";
import { over } from "./over.ts";

/** operation.server: prove's own checks of the call (who may call, steps, answer shape, declared errors) pass, and the call left its span. */
export const server = over("operation.server", (op, e) => [
  ...["who may call", "steps", "answer shape", "declared errors"].flatMap((check) => Reading.proved(e.prove, `${op.name} ${check}`)),
  ...(e.spans === undefined ? ["no spans were read from the prove run"] : Reading.spansNamed(e.spans, op.name).length > 0 ? [] : [`no span named ${op.name}: the call was never served and traced`]),
]);

/** operation.telemetry: each call has the operation's span (`operation`, `attempt`, who called) and a measured duration (`ortho.call.duration`). */
export const telemetry = over("operation.telemetry", (op, e) => {
  if (e.spans === undefined) return ["no spans were read from the prove run"];
  const spans = Reading.spansNamed(e.spans, op.name).filter((s) => s.attrs["operation"] === op.name);
  const timed = e.prove?.lines.find((l) => l.startsWith(`${op.name} performance `));
  return [
    ...(spans.length === 0 ? [`no span named ${op.name} carries operation=${op.name}`] : []),
    ...(spans.some((s) => s.attrs["attempt"] === undefined) ? [`a ${op.name} span has no attempt`] : []),
    ...(spans.some((s) => s.attrs["principal.person"] === undefined && s.attrs["principal.kind"] === undefined) ? [`a ${op.name} span does not say who called`] : []),
    ...(timed === undefined ? [`prove printed no performance line for ${op.name}`] : timed.includes("p95") ? [] : [`${op.name} has no measured duration (${timed.slice(op.name.length + 1)}): ortho.call.duration recorded nothing`]),
  ];
});
