// What `add` writes. Every gap is a `Blueprint.todo` saying what belongs there.
import { Names } from "orthograph/server";
import { article, pascal, prefixOf } from "./names.ts";

const header = `import { Blueprint } from "${Names.frontDoor}";`;

export const thingFiles = (thing: string) => {
  const T = pascal(thing);
  return [
    {
      path: `blueprint/things/${thing}/thing.ts`,
      content: `${header}

export const ${T} = Blueprint.thing({
  description: Blueprint.todo("what ${article(thing)} is, in one sentence"),
  fields: {
    id: Blueprint.id("${prefixOf(thing)}"),
  },
});
`,
    },
    {
      path: `blueprint/things/${thing}/machine.ts`,
      content: `${header}
import { ${T} } from "./thing.ts";

// The states ${article(thing)} can be in, and the moves between them. Each move names the event it emits (events.ts).
export const machine = Blueprint.machine(${T}, {
  states: Blueprint.todo("the states ${article(thing)} can be in, the first one where it starts"),
  moves: {},
  notFrom: { exit: 40 }, // the exit code when a move can't start from the state it's in
});
`,
    },
    {
      path: `blueprint/things/${thing}/roles.ts`,
      content: `${header}
import { ${T} } from "./thing.ts";

// Who a person is to ${article(thing)}. Rename the role to what it means.
export const holder = Blueprint.role(${T}, { rule: Blueprint.todo("when a person holds this role on ${article(thing)}") });
`,
    },
    {
      path: `blueprint/things/${thing}/events.ts`,
      content: `// What happened to ${article(thing)}, one event per move: \`export const ${T}Made = Blueprint.event({ ... })\`.
export {};
`,
    },
    {
      path: `blueprint/things/${thing}/errors.ts`,
      content: `// Refusals that depend on data: \`export class ${T}Missing extends Blueprint.error({ ... }, { exit: 40 }) {}\`.
// The machine's own refusal is generated and never written here.
export {};
`,
    },
    {
      path: `blueprint/things/${thing}/invariants.ts`,
      content: `// What stays true among many instances, one rule per export: \`export const oneHolder = Blueprint.invariant.unique(${T}.fields.name)\`.
export {};
`,
    },
    {
      path: `blueprint/values/${thing}.ts`,
      content: `// The values ${article(thing)}'s fields are made of: \`export const Amount = Blueprint.value(Blueprint.uint(128))\`.
export {};
`,
    },
  ];
};

export const operationFile = (thing: string, verb: string) => ({
  path: `blueprint/things/${thing}/verbs/${verb}.ts`,
  content: `${header}
import { ${pascal(thing)} } from "../thing.ts";

export default Blueprint.operation(${pascal(thing)}, {
  description: Blueprint.todo("what ${verb} does to ${article(thing)}, in one sentence"),
  payload: Blueprint.todo("what a caller sends"),
  answer: Blueprint.todo("what ${verb} answers"),
  allowed: Blueprint.todo("who may ${verb}"),
});
`,
});

export const readFile = (thing: string, verb: string) => ({
  path: `blueprint/things/${thing}/verbs/${verb}.ts`,
  content: `${header}
import { ${pascal(thing)} } from "../thing.ts";

// A read changes nothing, so it has no move and no handler: it answers from the ${thing}'s records.
export default Blueprint.read(${pascal(thing)}, {
  by: "id",
  fields: Blueprint.todo("the fields it answers"),
  allowed: Blueprint.todo("who may read ${article(thing)}"),
});
`,
});

export const journeyFile = (title: string, file: string) => ({
  path: `blueprint/journeys/${file}.ts`,
  content: `${header}

export default Blueprint.journey(${JSON.stringify(title)}, {
  cast: Blueprint.todo("who is in it, by role"),
  steps: () => Blueprint.todo("the steps, each a call and its checks"),
});
`,
});
