// The one real world of check 39: a copy of Plugged In with a defect planted in `link.add`'s `record` step, on workerd with prove's local Collector (no Docker,
// as check 20 runs it). aaron claims a name; aaron's `link.add` dies twice in `record` with a tagged error (`LedgerUnreachable`, a message of two lines); bob, who
// holds no name, is refused `LinkNeedsHandle` (a refusal, never a defect). The spans are read back from the Collector, as the runtime wrote them.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Span, Trace } from "@orthograph/prove";
import type { ModelIn } from "./monitor-fixture.ts";
import * as L from "./loop.ts";
import * as W from "./loop-world.ts";

export const PLANTED_TAG = "LedgerUnreachable";
export const PLANTED_CAUSE = "the ledger is unreachable";

export interface PlantedWorld {
  readonly root: string;
  readonly wire: unknown;
  readonly model: ModelIn;
  readonly traces: ReadonlyMap<string, Trace>;
  readonly defects: ReadonlyArray<string>;
  readonly refusal: string;
  readonly claim: string;
  readonly close: () => Promise<void>;
}

/** `link.add`'s record step, replaced: it dies with an error that carries a `_tag` and a two-line message, so that "the first line of its cause" is not the tag. */
const plant = (root: string) => {
  const file = join(root, "src/link/add.ts");
  const text = readFileSync(file, "utf8");
  const from = text.indexOf("    yield* steps.record(");
  const to = text.indexOf("    // The move add, to listed.");
  if (from < 0 || to < from) throw new Error("check 39 cannot plant its defect: examples/plugged-in/src/link/add.ts no longer has a `record` step followed by its move");
  writeFileSync(file, `${text.slice(0, from)}    yield* steps.record(Effect.die(new LedgerFault("${PLANTED_CAUSE}\\nsecond line of the cause")));\n\n${text.slice(to)}\nclass LedgerFault extends Error { readonly _tag = "${PLANTED_TAG}"; }\n`);
};

export const openPlanted = async (): Promise<PlantedWorld> => {
  const copy = L.freshProject(L.pluggedIn);
  let loop: W.Loop | undefined;
  try {
    plant(copy.root);
    loop = await W.openLoop(copy.root);
    const opened = loop;
    const people = await opened.cast(["aaron", "bob"]);
    const call = async (route: string, who: string, body: object) => {
      const before = opened.proxy.seen.length;
      const response = await fetch(`${opened.url}/${route}`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${people[who]}` }, body: JSON.stringify(body) });
      await response.text();
      return { status: response.status, trace: opened.proxy.seen[before]!.trace };
    };
    const link = { title: "a link", url: "https://example.com/" };
    const claim = await call("handle/claim", "aaron", { name: "aaron" });
    const first = await call("link/add", "aaron", link);
    const second = await call("link/add", "aaron", { ...link, title: "another link" });
    const refused = await call("link/add", "bob", link);
    if (claim.status !== 200 || first.status !== 500 || second.status !== 500 || refused.status !== 422) throw new Error(`check 39's world did not answer as planted: claim ${claim.status}, defects ${first.status} ${second.status}, refusal ${refused.status}`);
    const traces = new Map<string, Trace>();
    for (const { trace } of [claim, first, second, refused]) {
      const spans = await W.until<ReadonlyArray<Span>>(() => opened.spans(trace), (found) => found.some((s) => typeof s.attrs["operation"] === "string"));
      traces.set(trace, { spans: [...spans], logs: [] });
    }
    const wire = JSON.parse(readFileSync(join(copy.root, "generated/portal/blueprint.json"), "utf8")) as unknown;
    const model = JSON.parse(readFileSync(join(copy.root, "generated/model/model.json"), "utf8")) as ModelIn;
    return { root: copy.root, wire, model, traces, defects: [first.trace, second.trace], refusal: refused.trace, claim: claim.trace, close: async () => { await opened.close(); copy.remove(); } };
  } catch (error) {
    await loop?.close();
    copy.remove();
    throw error;
  }
};
