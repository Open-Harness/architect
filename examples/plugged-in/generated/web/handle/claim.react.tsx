// Generated from blueprint/things/handle/verbs/claim.ts. Do not edit.
"use client";
import { Field, FieldDescription, FieldLabel } from "@ui-sdk/react/field";
import { Input } from "@ui-sdk/react/input";
import { createParts } from "@ui-sdk/react/primitive";
import { options } from "../../actions/handle/claim.ts";
import { usePieceHost } from "../react.tsx";
import { handleClaim, type HandleClaimAnswer } from "./claim.ts";

const parts = createParts(handleClaim, { root: "form", refusal: "p", answer: "output", submit: "button" });

const Name = ({ label = "Name" }: { readonly label?: string }) => (
  <Field name="name">
    <FieldLabel>{label}</FieldLabel>
    <Input required />
    <FieldDescription>{"A name of up to 32 lowercase letters and digits, starting with a letter: the address of a public page."}</FieldDescription>
  </Field>
);

type RootProps = Parameters<typeof parts.Root>[0];
type Done = { readonly onDone?: (answer: HandleClaimAnswer) => void };
const Refusal = (props: Omit<Parameters<typeof parts.Refusal>[0], "children">) => <parts.Refusal {...props}>{(state) => state.text}</parts.Refusal>;
const Answer = (props: Omit<Parameters<typeof parts.Answer>[0], "children">) => <parts.Answer {...props}>{(state) => state.text}</parts.Answer>;

/** Claim a free name and make it the address of your public page, with its profile. */
export const HandleClaim = {
  Root: (props: RootProps) => <parts.Root aria-label="Claim handle" {...usePieceHost(options)} {...props} />,
  Name,
  Refusal,
  Answer,
  Submit: parts.Submit,
  Form: (props: Done & {  }) => (
    <HandleClaim.Root {...props}>
      <Name />
      <Refusal />
      <Answer />
      <parts.Submit>Claim</parts.Submit>
    </HandleClaim.Root>
  ),
};
