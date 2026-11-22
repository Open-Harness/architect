// Generated from blueprint/things/handle/verbs/claim.ts (model handle.claim). Do not edit.
import type { ComponentProps, ReactNode } from "react";
import { createParts } from "@ui-sdk/react/primitive";
import { handleClaim, type HandleClaimOutcome, type HandleClaimPayload } from "./handle-claim.ts";

const parts = createParts(handleClaim, { root: "form", name: "input", refusal: "p", submit: "button" });

/** How the verb is sent: the generated SDK in an app, a stand-in in this spike. `via` is the page's source of the press. */
export type Send = (payload: HandleClaimPayload, meta: { via: string }) => Promise<HandleClaimOutcome>;

/** Claim a free name and make it the address of your public page, with its profile. */
export const HandleClaim = ({ send, children, ...rest }: { send: Send; children?: ReactNode } & Omit<ComponentProps<typeof parts.Root>, "onSend" | "children">) => (
  <parts.Root {...rest} onSend={(payload, details) => details.settle(send(payload, { via: details.source }))}>
    {children}
  </parts.Root>
);
export const HandleClaimName = parts.Name;
export const HandleClaimRefusal = parts.Refusal;
export const HandleClaimSubmit = parts.Submit;
