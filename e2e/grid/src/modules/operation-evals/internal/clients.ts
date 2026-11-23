import { over } from "./over.ts";

/** The words a `--help` lists as subcommands (`  add       Append a link…`). */
const subcommands = (help: string): ReadonlyArray<string> => {
  const at = help.indexOf("SUBCOMMANDS");
  return at < 0 ? [] : help.slice(at).split("\n").slice(1).map((l) => /^\s{2}(\S+)/.exec(l)?.[1]).filter((w): w is string => w !== undefined);
};

/** operation.cli: the generated CLI lists the verb under its thing, and the verb's own `--help` carries the operation's description. */
export const cli = over("operation.cli", (op, e) => {
  const command = `${op.thing} ${op.verb}`;
  const help = e.cli[command];
  const group = e.cli[op.thing];
  if (help === undefined) return [`\`${command} --help\` could not be run through the generated CLI`];
  return [
    ...(group === undefined || subcommands(group).includes(op.verb) ? [] : [`\`${op.thing} --help\` lists no subcommand ${op.verb}`]),
    ...(help.includes(op.description ?? "\0") ? [] : [`\`${command} --help\` does not carry the operation's description "${op.description ?? ""}"; it prints "${help.split("\n").slice(0, 3).join(" / ").trim()}"`]),
  ];
});

/**
 * What a tool's description says after the model's: one sentence `Refuses <Error> when <reason>.` for each refusal a rule gives the operation (G5, ST1.17),
 * for exactly the errors the model's `invariants` names, each once, and nothing else. An operation no rule refuses for says no more than its own description.
 */
const ruleSentences = (rest: string, owed: ReadonlyArray<string>, described: Readonly<Record<string, string>>): ReadonlyArray<string> => {
  // One sentence after another, each `Refuses <Error> when <reason>.` A rule's written description is the reason whole, full stops inside it and all; a generated reason ends at the first full stop that is followed by a space or the end. Whatever is left over is not a sentence.
  const names: Array<string> = [];
  const odd: Array<string> = [];
  const text = rest.trim();
  for (let at = 0; at < text.length;) {
    const head = /Refuses (\w+) when (?=\S)/y;
    head.lastIndex = at;
    const opened = head.exec(text);
    if (opened === null) { odd.push(text.slice(at)); break; }
    const reason = described[opened[1]!]?.replace(/\.$/, "");
    const whole = reason !== undefined && text.startsWith(`${reason}.`, head.lastIndex) && (text.length === head.lastIndex + reason.length + 1 || text[head.lastIndex + reason.length + 1] === " ");
    const generated = /[^]*?\.(?= |$)/y;
    generated.lastIndex = head.lastIndex;
    // A rule with a written description says exactly it; a generated reason is any sentence.
    if (!whole && (reason !== undefined || generated.exec(text) === null)) { odd.push(text.slice(at)); break; }
    names.push(opened[1]!);
    at = whole ? head.lastIndex + reason!.length + 1 : generated.lastIndex;
    while (text[at] === " ") at += 1;
  }
  return [
    ...odd.map((s) => `"${s}" is not a "Refuses <Error> when <reason>." sentence`),
    ...owed.filter((n) => !names.includes(n)).map((n) => `no sentence for ${n}, which a rule refuses for this operation`),
    ...names.filter((n) => !owed.includes(n)).map((n) => `a sentence for ${n}, which no rule refuses for this operation`),
    ...names.filter((n, i) => names.indexOf(n) !== i).map((n) => `${n} is said more than once`),
  ];
};
/** A tool's description against the model's: the model's words, then only what `ruleSentences` allows. The problems, empty when it is right. */
const descriptionProblems = (tool: string | undefined, model: string | undefined, owed: ReadonlyArray<string>, described: Readonly<Record<string, string>>): ReadonlyArray<string> => {
  if (tool === undefined || model === undefined) return tool === model ? [] : [`the tool says "${tool ?? ""}", the model says "${model ?? ""}"`];
  if (tool === model) return owed.length === 0 ? [] : [`the tool says only "${tool}", the model also owes a sentence for ${owed.join(", ")}`];
  if (!tool.startsWith(`${model} `)) return [`the tool says "${tool}", the model says "${model}"`];
  const problems = ruleSentences(tool.slice(model.length), owed, described);
  return problems.length === 0 ? [] : [`the tool says "${tool}" after the model's "${model}": ${problems.join("; ")}`];
};

/** operation.mcp: one tool named as the operation, described as the model describes it (then a sentence for each refusal a rule owns), read-only exactly when it is a read. */
export const mcp = over("operation.mcp", (op, e) => {
  if (e.mcp === undefined) return ["the MCP server's tools/list could not be read"];
  const tool = e.mcp.find((t) => t.name === op.name);
  if (tool === undefined) return [`tools/list has no tool ${op.name}`];
  return [
    ...descriptionProblems(tool.description, op.description, Object.keys(op.invariants ?? {}), Object.fromEntries(Object.entries(op.invariants ?? {}).flatMap(([refusal, full]) => {
      const written = e.model.things[full.slice(0, full.indexOf("."))]?.invariants?.[full.slice(full.indexOf(".") + 1)]?.description;
      return written === undefined ? [] : [[refusal, written] as const];
    }))),
    ...((tool.annotations?.readOnlyHint === true) === (op.kind === "read") ? [] : [`the tool is ${tool.annotations?.readOnlyHint === true ? "" : "not "}marked read-only, but the model's ${op.name} is ${op.kind === "read" ? "a read" : "an operation"}`]),
    ...(tool.inputSchema === undefined ? ["the tool has no input schema"] : []),
  ];
});
