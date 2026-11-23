// The page the checks mount a generated piece in: check code (ST1.26), never generated, never the app's. Three things live here, and nothing else:
//   - the host seam, the one place the checks touch `@orthograph/web`: `WebHost.make({ client, ask })` (fixed by design/decisions/WEB-host-seam.md; K29 section 2 and the entry in section 4: the host gives an action its
//     client (the SDK's layer, the person's credential in it), the caller, a request key per form open, and a person to ask). If the builder's constructor is spelled differently, its author asks the
//     checks author, who changes this one line.
//   - UI SDK's own agent bridge, made with `createAgent` and handed to the test as `window.__ortho.agent`, as the spike did.
//   - the person the bridge asks: the test answers through `window.__ortho.asking`.
import "@ui-sdk/core/web.css";
import type { ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { createAgent } from "@ui-sdk/react/agent";
import { WebHost } from "@orthograph/web";
import { PluggedInHost } from "@plugged-in/web/react.tsx";
import * as PluggedIn from "@plugged-in/sdk";

interface Asking { readonly sentence: string; readonly answer: (yes: boolean) => void }
interface Ortho {
  token?: string;
  ready?: boolean;
  agent?: ReturnType<typeof createAgent>;
  /** Every sentence the agent bridge asked a person, in order. */
  asked: Array<string>;
  /** Every answer the form's `onDone` was called with: it must not be called for a refusal. */
  done: Array<unknown>;
  /** How many times the host (not the bridge) asked: a press the bridge already asked about must never ask again. */
  hostAsked: number;
  /** The question waiting for a person's answer right now, if any. */
  asking: Asking | null;
}
declare global { interface Window { __ortho: Ortho } }

export const mount = (view: ReactNode) => {
  const ortho = window.__ortho;
  ortho.asked = [];
  ortho.done = [];
  ortho.hostAsked = 0;
  ortho.asking = null;
  // `?allow=none`: nobody to ask, so a step on a control marked for a person's yes must be refused by the bridge itself.
  const nobody = new URLSearchParams(location.search).get("allow") === "none";
  ortho.agent = nobody
    ? createAgent()
    : createAgent({
        allow: (step: { readonly confirm?: string }) =>
          step.confirm === undefined
            ? true
            : new Promise<boolean>((answer) => {
                ortho.asked.push(step.confirm!);
                ortho.asking = { sentence: step.confirm!, answer: (yes) => { ortho.asking = null; answer(yes); } };
              }),
      });
  const host = WebHost.make({
    client: PluggedIn.layer({ url: location.origin, ...(ortho.token ? { credential: PluggedIn.Credential.session(ortho.token) } : {}) }),
    ask: () => { ortho.hostAsked += 1; return Promise.resolve(false); },
  });
  createRoot(document.getElementById("root")!).render(<PluggedInHost value={host}>{view}</PluggedInHost>);
  requestAnimationFrame(() => { ortho.ready = true; });
};
