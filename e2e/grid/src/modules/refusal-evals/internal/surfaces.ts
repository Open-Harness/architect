import type { Eval } from "../../grid/types.ts";
import type { RefusalEvidence } from "../types.ts";
import { declaredBy, factsOf } from "./facts.ts";

const escaped = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** error.docs: each declaring operation's page lists the refusal in its refusals table, with its exit and code. */
export const docs: Eval<RefusalEvidence> = {
  cell: "error.docs",
  judge: (subject, evidence) => {
    const facts = factsOf(evidence.model, subject);
    const operations = declaredBy(evidence.model, subject);
    if (operations.length === 0) return { ok: false, why: [`no operation declares ${subject}, so no docs page can list it`] };
    const problems = operations.flatMap((operation) => {
      const page = evidence.docs[operation];
      if (page === undefined) return [`${operation}: no docs page was read`];
      const row = new RegExp(`^\\| ${escaped(subject)} \\| ${facts.exit === undefined ? "[^|]*" : String(facts.exit)} \\| ${escaped(facts.code ?? "[^|]*")} \\|`, "m");
      return row.test(page) ? [] : [`${operation}: the docs page has no refusals row "| ${subject} | ${facts.exit ?? "…"} | ${facts.code ?? "…"} |"`];
    });
    return { ok: problems.length === 0, why: problems };
  },
};

const attrsOf = (tag: string) => Object.fromEntries([...tag.matchAll(/\b(data-[a-z-]+)="([^"]*)"/g)].map((m) => [m[1]!, m[2]!]));

/** error.portal: each declaring operation's page shows the refusal under its arrow, counted by code (`refusal-code[data-refusal][data-code][data-count]`), or, when its metrics source is unavailable, with no count and the `not-yet` marker. */
export const portal: Eval<RefusalEvidence> = {
  cell: "error.portal",
  judge: (subject, evidence) => {
    const facts = factsOf(evidence.model, subject);
    const operations = declaredBy(evidence.model, subject);
    if (operations.length === 0) return { ok: false, why: [`no operation declares ${subject}, so no portal page can show it`] };
    const problems = operations.flatMap((operation) => {
      const html = evidence.portal[operation];
      if (html === undefined) return [`${operation}: the portal page could not be read`];
      const shown = [...html.matchAll(/<[a-z][a-z0-9]*\b[^>]*\bdata-refusal="[^"]*"[^>]*>/g)].map((m) => attrsOf(m[0])).filter((a) => a["data-refusal"] === subject);
      if (shown.length === 0) return [`${operation}: the portal page shows no ${subject} (expected data-refusal="${subject}" data-code="${facts.code ?? "…"}" and a data-count)`];
      // A page that says its metrics are unavailable (`not-yet[data-hole="metrics"]`, as check 21 K reads it) has no count to show: a digit there,
      // zero included, is a guess. With a source the count is a digit, and it is the source's: here, the operation's refused spans: those the handler writes with `operation` and `refusal` on `<operation>` (an attempt, a read, a device call) and on `<operation>.refused` (a refusal at the door, before any handler). A retry that conflicted writes no refusal; one call, one refusing span.
      const noSource = [...html.matchAll(/<[a-z][a-z0-9]*\b[^>]*\bdata-hole="metrics"[^>]*>/g)].some((m) => attrsOf(m[0])["data-portal"] === "not-yet");
      const said = evidence.spans === undefined ? undefined : evidence.spans.filter((span) => span.attrs["operation"] === operation && span.attrs["refusal"] === subject).length;
      return shown.flatMap((a) => [
        ...(a["data-code"] === facts.code ? [] : [`${operation}: the portal counts ${subject} under code ${a["data-code"] ?? "none"}, expected ${facts.code ?? "its code"}`]),
        ...(noSource
          ? (a["data-count"] === undefined ? [] : [`${operation}: the portal says its metrics are unavailable and still shows ${subject} with data-count ${a["data-count"]}: unavailable is never a number, zero included`])
          : [
            ...(/^\d+$/.test(a["data-count"] ?? "") ? [] : [`${operation}: the portal shows ${subject} with no count (data-count ${a["data-count"] ?? "missing"}) and does not say its metrics are unavailable (a \`not-yet\` element with data-hole="metrics")`]),
            ...(said === undefined || !/^\d+$/.test(a["data-count"] ?? "") || Number(a["data-count"]) === said ? [] : [`${operation}: the portal counts ${subject} ${a["data-count"]} times, its source says ${said}`]),
          ]),
      ]);
    });
    return { ok: problems.length === 0, why: problems };
  },
};

/** error.telemetry: the span of the call that was refused carries `refusal.code`, the model's code. */
export const telemetry: Eval<RefusalEvidence> = {
  cell: "error.telemetry",
  judge: (subject, evidence) => {
    if (evidence.spans === undefined) return { ok: false, why: [`no spans were read for the run that refused ${subject}`] };
    const facts = factsOf(evidence.model, subject);
    const refused = evidence.spans.filter((span) => span.attrs["refusal"] === subject);
    if (refused.length === 0) return { ok: false, why: [`no span has refusal=${subject}: the refused call was not traced`] };
    const problems = refused.filter((span) => span.attrs["refusal.code"] !== facts.code)
      .map((span) => `span ${span.name} has refusal.code ${String(span.attrs["refusal.code"] ?? "none")}, expected ${facts.code ?? "the model's code"}`);
    return { ok: problems.length === 0, why: problems };
  },
};
