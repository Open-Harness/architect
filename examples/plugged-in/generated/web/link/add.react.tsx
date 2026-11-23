// Generated from blueprint/things/link/verbs/add.ts. Do not edit.
"use client";
import { Field, FieldDescription, FieldLabel } from "@ui-sdk/react/field";
import { Input } from "@ui-sdk/react/input";
import { createParts } from "@ui-sdk/react/primitive";
import { options } from "../../actions/link/add.ts";
import { usePieceHost } from "../react.tsx";
import { linkAdd, type LinkAddAnswer } from "./add.ts";

const parts = createParts(linkAdd, { root: "form", refusal: "p", answer: "output", submit: "button" });

const Title = ({ label = "Title" }: { readonly label?: string }) => (
  <Field name="title">
    <FieldLabel>{label}</FieldLabel>
    <Input required />
    <FieldDescription>{"What the link shows on the page, up to 120 characters."}</FieldDescription>
  </Field>
);

const Url = ({ label = "Url" }: { readonly label?: string }) => (
  <Field name="url">
    <FieldLabel>{label}</FieldLabel>
    <Input required />
    <FieldDescription>{"Where the link goes: a web address starting with http:// or https://, up to 2048 characters."}</FieldDescription>
  </Field>
);

type RootProps = Parameters<typeof parts.Root>[0];
type Done = { readonly onDone?: (answer: LinkAddAnswer) => void };
const Refusal = (props: Omit<Parameters<typeof parts.Refusal>[0], "children">) => <parts.Refusal {...props}>{(state) => state.text}</parts.Refusal>;
const Answer = (props: Omit<Parameters<typeof parts.Answer>[0], "children">) => <parts.Answer {...props}>{(state) => state.text}</parts.Answer>;

/** Append a link to your own public page. You need a claimed name first. */
export const LinkAdd = {
  Root: (props: RootProps) => <parts.Root aria-label="Add link" {...usePieceHost(options)} {...props} />,
  Title,
  Url,
  Refusal,
  Answer,
  Submit: parts.Submit,
  Form: (props: Done & {  }) => (
    <LinkAdd.Root {...props}>
      <Title />
      <Url />
      <Refusal />
      <Answer />
      <parts.Submit>Add</parts.Submit>
    </LinkAdd.Root>
  ),
};
