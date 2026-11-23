// Generated from blueprint/things/link/verbs/remove.ts. Do not edit.
"use client";
import { createParts } from "@ui-sdk/react/primitive";
import { options } from "../../actions/link/remove.ts";
import { usePieceHost } from "../react.tsx";
import { linkRemove, type LinkRemoveAnswer } from "./remove.ts";

const parts = createParts(linkRemove, { root: "form", refusal: "p", answer: "output", submit: "button" });

type RootProps = Parameters<typeof parts.Root>[0];
type Done = { readonly onDone?: (answer: LinkRemoveAnswer) => void };
const Refusal = (props: Omit<Parameters<typeof parts.Refusal>[0], "children">) => <parts.Refusal {...props}>{(state) => state.text}</parts.Refusal>;
const Answer = (props: Omit<Parameters<typeof parts.Answer>[0], "children">) => <parts.Answer {...props}>{(state) => state.text}</parts.Answer>;

/** Remove a link from a public page. */
export const LinkRemove = {
  Root: (props: RootProps) => <parts.Root aria-label="Remove link" {...usePieceHost(options)} {...props} />,
  Refusal,
  Answer,
  Submit: parts.Submit,
  Form: (props: Done & { readonly link: string; }) => (
    <LinkRemove.Root {...props}>
      <Refusal />
      <Answer />
      <parts.Submit>Remove</parts.Submit>
    </LinkRemove.Root>
  ),
};
