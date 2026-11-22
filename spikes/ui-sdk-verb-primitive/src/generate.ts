// The spike's generator: the model in, three files out. Pure string templates over `fixtures/model.json`.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

type Field = { value: { type: string; max?: number; prefix?: string }; named?: string; description?: string };
type Operation = {
  name: string; thing: string; verb: string; file: string; description: string;
  payload: Record<string, Field>; answer: Record<string, Field>; refusals: string[];
};
type Model = { operations: Record<string, Operation>; refusals: Record<string, string> };

const pascal = (text: string) => text.replace(/(^|[-.])(\w)/g, (_m, _s, letter: string) => letter.toUpperCase());
const tsType = (field: Field) => (field.value.type === "uint" ? "number" : "string");
const kind = (field: Field) => (field.value.type === "uint" ? "number" : "string");

const primitive = (op: Operation, model: Model) => {
  const name = `${op.thing}-${op.verb}`;
  const id = `${op.thing}${pascal(op.verb)}`;
  const fields = Object.entries(op.payload);
  const setters = fields.map(([key]) => `set${pascal(key)}`);
  return `// Generated from ${op.file} (model ${op.name}). Do not edit.
import { createChange, definePrimitive } from "@ui-sdk/core";
import { type Outcome, type Refusal, type SubmitDetails, submit } from "../src/runtime.ts";

export type ${pascal(id)}Payload = { ${fields.map(([key, field]) => `${key}: ${tsType(field)}`).join("; ")} };
export type ${pascal(id)}Answer = { ${Object.entries(op.answer).map(([key, field]) => `${key}: ${tsType(field)}`).join("; ")} };
export type ${pascal(id)}Outcome = Outcome<${pascal(id)}Answer>;

/** The declared refusals of ${op.name}, with their codes. */
export const ${id}Refusals = ${JSON.stringify(Object.fromEntries(op.refusals.map((r) => [r, model.refusals[r]])))} as const;

type Options = {
${fields.map(([key, field]) => `  ${key}?: ${tsType(field)};\n  default${pascal(key)}?: ${tsType(field)};\n  on${pascal(key)}Change?: (value: ${tsType(field)}, details: { reason: string; source: string; cancel: () => void }) => void;`).join("\n")}
  onSend?: (payload: ${pascal(id)}Payload, details: SubmitDetails<${pascal(id)}Answer>) => void;
  onDone?: (answer: ${pascal(id)}Answer) => void;
};

/** ${op.description} */
export const ${id} = definePrimitive({
  name: "${name}",
  options: {
${fields.map(([key, field]) => `    ${key}: "${kind(field)}",\n    default${pascal(key)}: "${kind(field)}",\n    on${pascal(key)}Change: "callback",`).join("\n")}
    onSend: "callback",
    onDone: "callback",
  },
  controlled: [${fields.map(([key]) => `"${key}"`).join(", ")}],
  state: (options: Options) => ({
${fields.map(([key, field]) => `    ${key}: options.default${pascal(key)} ?? ${tsType(field) === "number" ? "0" : '""'},`).join("\n")}
    pending: false,
    refusal: null as Refusal | null,
    error: null as string | null,
    done: false,
  }),
  sync: (options) => ({
${fields.map(([key]) => `    ...(options.${key} === undefined ? {} : { ${key}: options.${key} }),`).join("\n")}
  }),
  api: (context) => {
    const change = createChange(context);
    return {
${fields.map(([key, field]) => `      set${pascal(key)}: (value: ${tsType(field)}, event?: Event) => change("${key}", value, { reason: "input" as never, event }),`).join("\n")}
      submit: (event?: Event) => submit(context as never, ((state: { ${fields.map(([key, field]) => `${key}: ${tsType(field)}`).join("; ")} }) => ({ ${fields.map(([key]) => `${key}: state.${key}`).join(", ")} })) as never, event),
    };
  },
  slots: (slot) => ({
    root: slot({
      attrs: (state) => ({ "data-pending": state.pending ? "" : undefined, "data-done": state.done ? "" : undefined }),
      on: {
        submit: (event, { api }) => {
          event.preventDefault();
          void api.submit(event);
        },
      },
    }),
${fields.map(([key, field]) => `    ${key}: slot({
      // ${field.named ?? field.value.type}: ${field.description ?? ""}
      attrs: (state) => ({ name: "${key}", value: String(state.${key}),${field.value.max ? ` maxlength: "${field.value.max}",` : ""} "aria-invalid": state.refusal ? "true" : undefined }),
      on: { input: (event, { el, api }) => api.set${pascal(key)}((el as HTMLInputElement).value${tsType(field) === "number" ? " as never" : ""}, event) },
    }),`).join("\n")}
    refusal: slot<{}, { name: string | null; code: string | null }>({
      present: (state) => state.refusal !== null,
      role: "alert",
      state: (state) => ({ name: state.refusal?.name ?? null, code: state.refusal?.code ?? null }),
    }),
    submit: slot({
      attrs: (state) => ({ type: "submit", disabled: state.pending ? "" : undefined }),
    }),
  }),
  agent: { actions: [${[...setters, "submit"].map((a) => `"${a}"`).join(", ")}] },
});
`;
};

const react = (op: Operation) => {
  const id = `${op.thing}${pascal(op.verb)}`;
  const P = pascal(id);
  const fields = Object.keys(op.payload);
  return `// Generated from ${op.file} (model ${op.name}). Do not edit.
import type { ComponentProps, ReactNode } from "react";
import { createParts } from "@ui-sdk/react/primitive";
import { ${id}, type ${P}Outcome, type ${P}Payload } from "./${op.thing}-${op.verb}.ts";

const parts = createParts(${id}, { root: "form", ${fields.map((f) => `${f}: "input"`).join(", ")}, refusal: "p", submit: "button" });

/** How the verb is sent: the generated SDK in an app, a stand-in in this spike. \`via\` is the page's source of the press. */
export type Send = (payload: ${P}Payload, meta: { via: string }) => Promise<${P}Outcome>;

/** ${op.description} */
export const ${P} = ({ send, children, ...rest }: { send: Send; children?: ReactNode } & Omit<ComponentProps<typeof parts.Root>, "onSend" | "children">) => (
  <parts.Root {...rest} onSend={(payload, details) => details.settle(send(payload, { via: details.source }))}>
    {children}
  </parts.Root>
);
${fields.map((f) => `export const ${P}${pascal(f)} = parts.${pascal(f)};`).join("\n")}
export const ${P}Refusal = parts.Refusal;
export const ${P}Submit = parts.Submit;
`;
};


const web = (op: Operation) => {
  const id = `${op.thing}${pascal(op.verb)}`;
  const tag = `linkup-${op.thing}-${op.verb}`;
  const fields = Object.keys(op.payload);
  return `// Generated from ${op.file} (model ${op.name}). Do not edit.
import { createParts, wrappedButton, wrappedChild } from "@ui-sdk/web";
import { ${id} } from "./${op.thing}-${op.verb}.ts";

/** Custom elements for a plain page, such as one of Frappe's: <${tag}><form>...</form></${tag}>. */
createParts(${id}, {
  root: { tag: "${tag}", target: wrappedChild("form"), display: "contents", api: [${[...fields.map((f) => `"set${pascal(f)}"`), '"submit"'].join(", ")}] },
${fields.map((f) => `  ${f}: { tag: "${tag}-${f}", target: wrappedChild("input"), display: "contents" },`).join("\n")}
  refusal: "${tag}-refusal",
  submit: { tag: "${tag}-submit", target: wrappedButton, display: "contents" },
});
`;
};

const model = JSON.parse(readFileSync(new URL("../fixtures/model.json", import.meta.url), "utf8")) as Model;
mkdirSync(new URL("../generated/", import.meta.url), { recursive: true });
for (const op of Object.values(model.operations)) {
  const base = `${op.thing}-${op.verb}`;
  writeFileSync(new URL(`../generated/${base}.ts`, import.meta.url), primitive(op, model));
  writeFileSync(new URL(`../generated/${base}.react.tsx`, import.meta.url), react(op));
  writeFileSync(new URL(`../generated/${base}.web.ts`, import.meta.url), web(op));
  console.log(`wrote generated/${base}.ts`, `generated/${base}.react.tsx`, `generated/${base}.web.ts`);
}
