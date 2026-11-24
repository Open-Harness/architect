// A conversation's committed model steps, from its entries (GOAL17-check-harness, call 1): one for each `pi.assistant` entry, numbered from 1 in the run that follows its input.
export interface Step {
  readonly requestId: string;
  readonly round: number;
  readonly tools: ReadonlyArray<string>;
  readonly text: string;
}

interface Part { readonly type?: string; readonly text?: string; readonly name?: string }
interface Entry { readonly kind: string; readonly model?: ReadonlyArray<{ readonly content?: unknown }>; readonly data?: unknown }

const partsOf = (entry: Entry): ReadonlyArray<Part> => {
  const content = entry.model?.[0]?.content;
  return Array.isArray(content) ? (content as ReadonlyArray<Part>) : typeof content === "string" ? [{ type: "text", text: content }] : [];
};

/** The entries oldest first. A user entry starts a run (its round count starts again); an assistant entry is a step of the current run. */
export const stepsOf = (entries: ReadonlyArray<Entry>): ReadonlyArray<Step> => {
  let round = 0;
  let requestId = "";
  const steps: Array<Step> = [];
  for (const entry of entries) {
    if (entry.kind === "pi.user") {
      round = 0;
      requestId = typeof (entry.data as { readonly requestId?: unknown } | undefined)?.requestId === "string" ? String((entry.data as { requestId: string }).requestId) : requestId;
    } else if (entry.kind === "pi.assistant") {
      round += 1;
      const parts = partsOf(entry);
      steps.push({
        requestId, round,
        tools: parts.filter((p) => p.type === "toolCall" && p.name !== undefined).map((p) => String(p.name)),
        text: parts.filter((p) => p.type === "text").map((p) => p.text ?? "").join(""),
      });
    }
  }
  return steps;
};
