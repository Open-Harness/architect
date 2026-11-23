// generated/web/<thing>/<verb>.react.tsx: the piece's React parts (Q4: React only in the beta). A root and one part per payload field, the way UI SDK's own
// components are shaped, and the whole form for a page that needs no layout of its own; an operation that needs a person's yes gets the dialog (K29 section 3.3).
import type { FieldModel, OperationModel } from "@orthograph/compiler";
import { camel, lines, pascal } from "#modules/names/service.js";
import type { RenderedFile } from "#modules/names/types.js";
import { comment, exportOf, inputsOf, issues, kindOf, labelOf, nameOf, subjectOf } from "./shape.ts";

const text = (value: string) => `{${JSON.stringify(value)}}`;

/** One payload field as a UI SDK `Field`: its label from its key, its help from what the blueprint says it is. A secret is a password the agent fills and never reads. */
const field = (key: string, f: FieldModel): ReadonlyArray<string> => {
  const mark = f.visibility === "secret" ? ` data-agent-secret=""` : typeof f.visibility === "object" ? ` data-agent-hidden=""` : "";
  const input = [f.visibility === "secret" ? `type="password"` : f.value.type === "uint" ? `inputMode="numeric"` : undefined, f.optional === true ? undefined : "required"].filter((x) => x !== undefined).join(" ");
  return [
    `const ${pascal(key)} = ({ label = ${JSON.stringify(labelOf(key))} }: { readonly label?: string }) => (`,
    `  <Field name=${JSON.stringify(key)}${mark}>`,
    `    <FieldLabel>{label}</FieldLabel>`,
    `    <Input${input === "" ? "" : ` ${input}`} />`,
    ...(f.description === undefined ? [] : [`    <FieldDescription>${text(f.description)}</FieldDescription>`]),
    `  </Field>`,
    `);`,
    "",
  ];
};

const imports = (op: OperationModel, kind: ReturnType<typeof kindOf>): ReadonlyArray<string> => {
  const inputs = kind !== "read" && inputsOf(op).length > 0;
  return [
    `// Generated from ${op.file}. Do not edit.`,
    `"use client";`,
    ...(op.needsApproval === true ? [`import { AlertDialog, AlertDialogBackdrop, AlertDialogClose, AlertDialogContent, AlertDialogDescription, AlertDialogTitle, AlertDialogTrigger } from "@ui-sdk/react/alert-dialog";`] : []),
    ...(inputs ? [`import { Field, FieldDescription, FieldLabel } from "@ui-sdk/react/field";`, `import { Input } from "@ui-sdk/react/input";`] : []),
    `import { createParts } from "@ui-sdk/react/primitive";`,
    ...(op.needsApproval === true ? [`import { useState } from "react";`] : []),
    `import { options } from "../../actions/${op.thing}/${op.verb}.ts";`,
    `import { usePieceHost } from "../react.tsx";`,
    `import { ${camel(op.thing)}${pascal(op.verb)}, type ${pascal(op.thing)}${pascal(op.verb)}Answer } from "./${op.verb}.ts";`,
    "",
  ];
};

const read = (op: OperationModel): ReadonlyArray<string> => [
  ...imports(op, "read"),
  `const parts = createParts(${camel(op.thing)}${pascal(op.verb)}, { root: "div", refusal: "p" });`,
  "",
  `type RootProps = Parameters<typeof parts.Root>[0];`,
  "",
  `/** ${comment(op.description)} */`,
  `export const ${exportOf(op)} = {`,
  `  Root: (props: RootProps) => <parts.Root aria-label=${JSON.stringify(nameOf(op))} {...usePieceHost(options)} {...props} />,`,
  `  Refusal: (props: Omit<Parameters<typeof parts.Refusal>[0], "children">) => <parts.Refusal {...props}>{(state) => state.text}</parts.Refusal>,`,
  `};`,
];

/** The dialog an operation that needs a person's yes asks through: the confirming button carries the operation's own description for UI SDK's bridge, and a person's press on it is the yes. */
const dialog = (op: OperationModel): ReadonlyArray<string> => [
  `      <AlertDialog open={open} onOpenChange={setOpen}>`,
  `        <AlertDialogTrigger>${nameOf(op)}</AlertDialogTrigger>`,
  `        <AlertDialogBackdrop />`,
  `        <AlertDialogContent>`,
  `          <AlertDialogTitle>${nameOf(op)}?</AlertDialogTitle>`,
  `          <AlertDialogDescription>${text(op.description)}</AlertDialogDescription>`,
  `          <AlertDialogClose>Keep it</AlertDialogClose>`,
  `          <parts.Submit data-agent-confirm=${text(op.description)} onClick={() => setOpen(false)}>${labelOf(op.verb)}</parts.Submit>`,
  `        </AlertDialogContent>`,
  `      </AlertDialog>`,
];

const write = (op: OperationModel): ReadonlyArray<string> => {
  const name = exportOf(op);
  const subject = subjectOf(op);
  const inputs = inputsOf(op);
  const approval = op.needsApproval === true;
  const given = subject.map((key) => `readonly ${key}: string;`).join(" ");
  const forward = `{...props}`;
  const fields = inputs.map(([key]) => `<${pascal(key)} />`);
  const body = (inner: ReadonlyArray<string>, indent: string) => inner.map((l) => `${indent}${l}`);
  return [
    ...imports(op, kindOf(op)),
    `const parts = createParts(${camel(op.thing)}${pascal(op.verb)}, { root: "form", refusal: "p", answer: "output", submit: "button" });`,
    "",
    ...inputs.flatMap(([key, f]) => field(key, f)),
    `type RootProps = Parameters<typeof parts.Root>[0];`,
    `type Done = { readonly onDone?: (answer: ${name}Answer) => void };`,
    `const Refusal = (props: Omit<Parameters<typeof parts.Refusal>[0], "children">) => <parts.Refusal {...props}>{(state) => state.text}</parts.Refusal>;`,
    `const Answer = (props: Omit<Parameters<typeof parts.Answer>[0], "children">) => <parts.Answer {...props}>{(state) => state.text}</parts.Answer>;`,
    "",
    `/** ${comment(op.description)} */`,
    `export const ${name} = {`,
    `  Root: (props: RootProps) => <parts.Root aria-label=${JSON.stringify(nameOf(op))} {...usePieceHost(options)} {...props} />,`,
    ...inputs.map(([key]) => `  ${pascal(key)},`),
    `  Refusal,`,
    `  Answer,`,
    `  Submit: parts.Submit,`,
    ...(approval
      ? [
          `  Confirm: (props: Done & { ${given} }) => {`,
          `    const [open, setOpen] = useState(false);`,
          `    return (`,
          `      <${name}.Root ${forward}>`,
          ...body(fields, "        "),
          ...dialog(op).map((l) => `  ${l}`),
          `        <Refusal />`,
          `      </${name}.Root>`,
          `    );`,
          `  },`,
        ]
      : [
          `  Form: (props: Done & { ${given} }) => (`,
          `    <${name}.Root ${forward}>`,
          ...body(fields, "      "),
          `      <Refusal />`,
          // An issued answer (a session, a key) leaves in `onDone`, once, and is never shown by the piece.
          ...(issues(op) ? [] : [`      <Answer />`]),
          `      <parts.Submit>${labelOf(op.verb)}</parts.Submit>`,
          `    </${name}.Root>`,
          `  ),`,
        ]),
    `};`,
  ];
};

export const renderReact = (op: OperationModel): RenderedFile => ({
  path: `generated/web/${op.thing}/${op.verb}.react.tsx`,
  scaffold: false,
  content: lines(kindOf(op) === "read" ? read(op) : write(op)),
});
