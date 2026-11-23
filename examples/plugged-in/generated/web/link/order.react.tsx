// Generated from blueprint/things/link/verbs/order.ts. Do not edit.
"use client";
import { Field, FieldDescription, FieldLabel } from "@ui-sdk/react/field";
import { Input } from "@ui-sdk/react/input";
import { createParts } from "@ui-sdk/react/primitive";
import { options } from "../../actions/link/order.ts";
import { usePieceHost } from "../react.tsx";
import { linkOrder, type LinkOrderAnswer } from "./order.ts";

const parts = createParts(linkOrder, { root: "form", refusal: "p", answer: "output", submit: "button" });

const Position = ({ label = "Position" }: { readonly label?: string }) => (
  <Field name="position">
    <FieldLabel>{label}</FieldLabel>
    <Input inputMode="numeric" required />
    <FieldDescription>{"Its place in the page's list of links: 0 is first."}</FieldDescription>
  </Field>
);

type RootProps = Parameters<typeof parts.Root>[0];
type Done = { readonly onDone?: (answer: LinkOrderAnswer) => void };
const Refusal = (props: Omit<Parameters<typeof parts.Refusal>[0], "children">) => <parts.Refusal {...props}>{(state) => state.text}</parts.Refusal>;
const Answer = (props: Omit<Parameters<typeof parts.Answer>[0], "children">) => <parts.Answer {...props}>{(state) => state.text}</parts.Answer>;

/** Move a link to a zero-based position. A position past the end puts it last. */
export const LinkOrder = {
  Root: (props: RootProps) => <parts.Root aria-label="Order link" {...usePieceHost(options)} {...props} />,
  Position,
  Refusal,
  Answer,
  Submit: parts.Submit,
  Form: (props: Done & { readonly link: string; }) => (
    <LinkOrder.Root {...props}>
      <Position />
      <Refusal />
      <Answer />
      <parts.Submit>Order</parts.Submit>
    </LinkOrder.Root>
  ),
};
