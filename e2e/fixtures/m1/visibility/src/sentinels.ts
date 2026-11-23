// Scaffolded from blueprint/things/locker/verbs/open.ts. Yours from now on.
// The values the handlers plant. The check writes fresh ones over this file before it generates, so a value found anywhere
// else is a leak; these defaults only let `ortho prove` run the fixture on its own.
export const sentinels = {
  label: "LABEL-default", note: "NOTE-default", code: "CODE-default", seal: "SEAL-default", hint: "HINT-default", memo: "MEMO-default",
  pin: "PIN-default", residue: "RESIDUE-default", residueRefusal: "RESIDUE-REFUSAL-default",
} as const;
