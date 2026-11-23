// What check 34 (ST1.19) judges Plugged In with: the rules the slice declares, read out of the compiled model and the handlers' source. The expected values are the slice's own
// words (`design/milestones.md`, ST1.19, and G5 section 1), never read from the output they judge. Pure functions: the controls in the check plant each wrong output.

/** A rule as the model carries it (`things.<t>.invariants.<rule>`). */
export interface RuleModel { readonly kind?: string; readonly fields?: ReadonlyArray<string>; readonly while?: ReadonlyArray<string>; readonly refuse?: string; readonly description?: string }
export interface ModelView {
  readonly things: Readonly<Record<string, { readonly invariants?: Readonly<Record<string, RuleModel>> }>>;
  readonly operations: Readonly<Record<string, { readonly errors?: ReadonlyArray<string>; readonly refusals?: ReadonlyArray<string>; readonly invariants?: Readonly<Record<string, string>> }>>;
}

/** G5 section 1, as Plugged In writes it: `handle/invariants.ts` and `profile/invariants.ts`. Three rules and no others, and only one of them has a `description`. */
export const WANTED: Readonly<Record<string, Readonly<Record<string, RuleModel>>>> = {
  handle: {
    oneHolderPerName: { kind: "unique", fields: ["name"], while: ["claimed"], refuse: "HandleTaken" },
    oneNamePerPerson: { kind: "unique", fields: ["owner"], while: ["claimed"], refuse: "HandleAlreadyOwned", description: "you already hold a name" },
  },
  profile: { onePagePerHandle: { kind: "unique", fields: ["handle"] } },
};
export const REFUSALS = { HandleTaken: "handle.oneHolderPerName", HandleAlreadyOwned: "handle.oneNamePerPerson" } as const;

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Every rule the model declares is one of the three, exactly as wanted: nothing missing, nothing added, no field, scope, refusal or description different. */
export const ruleProblems = (model: ModelView): ReadonlyArray<string> => {
  const things = Object.keys(model.things);
  return [
    ...Object.entries(WANTED).flatMap(([thing, rules]) => model.things[thing] === undefined ? [`the model has no thing ${thing}`] : Object.entries(rules).flatMap(([name, want]) => {
      const got = model.things[thing]!.invariants?.[name];
      if (got === undefined) return [`${thing}.${name} is not declared`];
      return (["kind", "fields", "while", "refuse", "description"] as const).flatMap((key) => same(got[key], want[key]) ? [] : [`${thing}.${name}: ${key} is ${JSON.stringify(got[key])}, expected ${JSON.stringify(want[key])}`]);
    })),
    ...things.flatMap((thing) => Object.keys(model.things[thing]!.invariants ?? {}).filter((name) => WANTED[thing]?.[name] === undefined).map((name) => `${thing}.${name} is declared, and is not one of the three rules`)),
  ];
};

/** The operations: `handle.claim` hands both refusals to the rules (they are no longer its `errors`, and still its refusals), and no other operation maps one, or lists either as its own error. */
export const operationProblems = (model: ModelView): ReadonlyArray<string> => {
  const claim = model.operations["handle.claim"];
  return [
    ...(claim === undefined ? ["the model has no operation handle.claim"] : [
      ...(same(claim.errors ?? [], []) ? [] : [`handle.claim's errors are ${JSON.stringify(claim.errors)}, expected []: the rules own both refusals`]),
      ...(same(claim.invariants, REFUSALS) ? [] : [`handle.claim maps ${JSON.stringify(claim.invariants)}, expected ${JSON.stringify(REFUSALS)}`]),
      ...Object.keys(REFUSALS).filter((r) => !(claim.refusals ?? []).includes(r)).map((r) => `handle.claim no longer refuses ${r}`),
    ]),
    ...Object.entries(model.operations).filter(([name]) => name !== "handle.claim").flatMap(([name, op]) => [
      ...(op.invariants === undefined ? [] : [`${name} maps refusals to rules (${JSON.stringify(op.invariants)}), and only handle.claim can break one`]),
      ...Object.keys(REFUSALS).filter((r) => (op.errors ?? []).includes(r)).map((r) => `${name} lists ${r} among its errors, which a rule owns`),
    ]),
  ];
};

/** A source as code alone: block and line comments taken off (a name in a comment is not used). */
export const code = (source: string) => source.replace(/\/\*[^]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
const escaped = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const findsBy = (source: string, rule: string) => new RegExp(`\\bfindBy\\(\\s*${escaped(rule)}\\s*,`).test(code(source));
const imports = (source: string, rule: string, from: string) => new RegExp(`import\\s*\\{[^}]*\\b${escaped(rule)}\\b[^}]*\\}\\s*from\\s*["'][^"']*${escaped(from)}["']`).test(code(source));

export type Sources = Readonly<Record<"profile.get" | "handle.resolve" | "link.add" | "handle.claim", string>> & { readonly others: Readonly<Record<string, string>> };

/** The reads go through the rules (G5 section 4): each by the rule it is keyed on, imported from the thing's `invariants.ts`, and no read is left on G4's `findBy(Thing, "field", …)`. */
export const readProblems = (src: Sources): ReadonlyArray<string> => {
  const reads: ReadonlyArray<readonly [keyof Omit<Sources, "others">, string, string]> = [
    ["profile.get", "onePagePerHandle", "blueprint/things/profile/invariants.ts"],
    ["handle.resolve", "oneHolderPerName", "blueprint/things/handle/invariants.ts"],
    ["link.add", "oneNamePerPerson", "blueprint/things/handle/invariants.ts"],
    ["link.add", "onePagePerHandle", "blueprint/things/profile/invariants.ts"],
  ];
  const all = { ...src.others, "profile.get": src["profile.get"], "handle.resolve": src["handle.resolve"], "link.add": src["link.add"], "handle.claim": src["handle.claim"] };
  return [
    ...reads.flatMap(([op, rule, from]) => [
      ...(findsBy(src[op], rule) ? [] : [`${op} does not find through findBy(${rule}, …)`]),
      ...(imports(src[op], rule, from) ? [] : [`${op} does not import ${rule} from ${from}`]),
    ]),
    ...Object.entries(all).filter(([, text]) => /\bfindBy\(\s*[A-Z]\w*\s*,\s*["'`]/.test(code(text))).map(([name]) => `${name} still finds by G4's findBy(Thing, "field", …)`),
  ];
};

/**
 * What the runtime owns, in every file of the project's `src`: neither refusal is named in code (a handler that refuses by hand in a file of its own, or one the claim imports, is the same
 * defect as one in `claim.ts`), and no handler writes the attributes the runtime puts on a refused call's span (`refusal.invariant`, `refusal.log`): they say which rule decided.
 */
export const ownedProblems = (files: Readonly<Record<string, string>>): ReadonlyArray<string> =>
  Object.entries(files).flatMap(([name, text]) => [
    ...["HandleTaken", "HandleAlreadyOwned"].filter((n) => new RegExp(`\\b${n}\\b`).test(code(text))).map((n) => `${name} names ${n}: the runtime refuses it, for the rules`),
    ...["refusal.invariant", "refusal.log"].filter((a) => code(text).includes(a)).map((a) => `${name} writes ${a}, which the runtime writes on a refused call`),
    ...(/\bdeclared\b[^\n;]*\[/.test(code(text)) ? [`${name} picks a declared error by a computed name, which no name search can read`] : []),
  ]);

/** The claim handler leaves the refusals to the runtime: it looks nothing up and names neither error in code. */
export const claimProblems = (claim: string): ReadonlyArray<string> => [
  ...(/\bfindBy\(/.test(code(claim)) ? ["handle.claim still looks a holder up with findBy: the runtime refuses for the rules"] : []),
  ...["HandleTaken", "HandleAlreadyOwned"].filter((n) => new RegExp(`\\b${n}\\b`).test(code(claim))).map((n) => `handle.claim's handler still names ${n}`),
];
