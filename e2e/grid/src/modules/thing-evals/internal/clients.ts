import type { FieldModel } from "../../project-evidence/types.ts";
import { OutputSchema } from "../../output-schema/service.ts";
import { operationsOf, over, publicFields } from "./over.ts";

const escaped = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** A flag is declared on a line of its own: it starts the line, alone or after a short form (`-p, --position`). */
const declaration = (name: string) => new RegExp(`^\\s*(?:-[A-Za-z]\\s*,?\\s*)?--${escaped(name)}(?![A-Za-z0-9-])(.*)$`);
const startsAFlag = (line: string) => /^\s*(?:-[A-Za-z]\s*,?\s*)?--[A-Za-z]/.test(line);
/** A heading ends a section: an unindented line (`FLAGS`, `GLOBAL FLAGS`, `Options:`). */
const isHeading = (line: string) => /^\S/.test(line) && line.trim() !== "";

/**
 * One flag as its own declaration states it: the type token right after the name (`string`, `<integer>`, `=INTEGER`), and the description, which
 * is whatever follows the type on that line and on the lines below it until the next flag, a blank line or a heading, so the last flag's text
 * ends with the flags section. The usage line and other flags' descriptions never name a flag; only a declaration does.
 */
const flagOf = (help: string, name: string): { readonly type: string; readonly description: string } | undefined => {
  const lines = help.split("\n");
  const at = lines.findIndex((line) => declaration(name).test(line));
  if (at < 0) return undefined;
  const after = declaration(name).exec(lines[at]!)![1]!.replace(/^\s*=/, " ");
  const following: Array<string> = [];
  for (const line of lines.slice(at + 1)) {
    if (line.trim() === "" || isHeading(line) || startsAFlag(line)) break;
    following.push(line.trim());
  }
  return typeAndDescription(`${after} ${following.join(" ")}`.replace(/\s+/g, " ").trim());
};

/** Words a help prints as a type when it has no brackets around it. */
const TYPE_WORDS = new Set(["uint", "int", "integer", "number", "float", "string", "text", "boolean", "bool", "choice", "enum", "json", "id", "path", "file", "url", "uuid"]);
/** A type expression written whole: `<integer>`, `[a | b]`, `{a,b}`, `(integer)`. */
const BRACKETED = /^(?:<([^<>]*)>|\[([^[\]]*)\]|\{([^{}]*)\}|\(([^()]*)\))\s*/;

/**
 * Splits what follows a flag's name into its type and its description. The type is the whole expression when it opens with a bracket (`<listed | removed>`),
 * else the first word when it is one a help prints as a type (`integer`, `TEXT`), else the first `<…>` expression anywhere after (a type written after
 * the description); and there is none otherwise.
 */
const typeAndDescription = (text: string): { readonly type: string; readonly description: string } => {
  const lead = BRACKETED.exec(text);
  if (lead !== null) return { type: (lead[1] ?? lead[2] ?? lead[3] ?? lead[4] ?? "").trim().toLowerCase(), description: text.slice(lead[0].length) };
  const first = /^(\S+)\s*(.*)$/.exec(text);
  const word = (first?.[1] ?? "").replace(/[.,:]+$/g, "");
  if (TYPE_WORDS.has(word.toLowerCase())) return { type: word.toLowerCase(), description: first?.[2] ?? "" };
  const later = /<([^<>]*)>/.exec(text);
  if (later !== null) return { type: later[1]!.trim().toLowerCase(), description: text.replace(later[0], " ").replace(/\s+/g, " ").trim() };
  return { type: "", description: text };
};

/** A number is shown as a number, an enum as its choices: judged on the flag's own type token, never on a word in its description. */
const numeric = new Set(["uint", "int", "integer", "number", "float"]);
const wrongType = (field: FieldModel, flag: { readonly type: string }): string | undefined =>
  numeric.has(field.value.type) && !numeric.has(flag.type) ? `a ${field.value.type} is shown as ${flag.type === "" ? "no type" : `"${flag.type}"`}, not a number`
  : field.value.type === "enum" && !/^(choice|enum|oneof)$|[|,]/.test(flag.type) ? `an enum is shown as ${flag.type === "" ? "no type" : `"${flag.type}"`}, not its choices`
  : undefined;

/** thing.cli: each public payload field is a declared flag, typed from its value (a number is a number) and carrying the field's description. */
export const cli = over("thing.cli", (thing, e) => operationsOf(e, thing.name).flatMap((op) => {
  const command = `${op.thing} ${op.verb}`;
  const help = e.cli[command];
  if (help === undefined) return [`\`${command} --help\` could not be run through the generated CLI`];
  return publicFields(op.payload).flatMap(([name, field]) => {
    const flag = flagOf(help, name);
    if (flag === undefined) return [`${command} has no --${name} flag`];
    const typed = wrongType(field, flag);
    return [
      ...(typed === undefined ? [] : [`${command} --${name}: ${typed}`]),
      ...(field.description === undefined || flag.description.includes(field.description) ? [] : [`${command} --${name} does not carry the field's description "${field.description}"`]),
    ];
  });
}));

/**
 * thing.mcp: each tool's input schema has every public payload field (with its description), and the tool offers an output schema when the answer has
 * fields, one that works: it accepts the operation's answer and its refusals and refuses what is neither (`OutputSchema`, validated as the SDK client does).
 */
export const mcp = over("thing.mcp", (thing, e) => {
  if (e.mcp === undefined) return ["the MCP server's tools/list could not be read"];
  const tools = e.mcp;
  return operationsOf(e, thing.name).flatMap((op) => {
    const tool = tools.find((t) => t.name === op.name);
    if (tool === undefined) return [`tools/list has no tool ${op.name}`];
    const properties = tool.inputSchema?.properties ?? {};
    const want = publicFields(op.payload);
    return [
      ...want.filter(([name]) => properties[name] === undefined).map(([name]) => `${op.name}'s input schema leaves out the public field ${name}`),
      ...Object.keys(properties).filter((name) => !want.some(([w]) => w === name)).map((name) => `${op.name}'s input schema shows ${name}, which is not a public payload field`),
      ...want.flatMap(([name, field]) => (field.description !== undefined && properties[name] !== undefined && properties[name]!.description !== field.description ? [`${op.name}'s input ${name} does not carry the field's description`] : [])),
      ...(Object.keys(op.answer).length > 0 && tool.outputSchema === undefined ? [`${op.name} offers no output schema, so an agent does not know the shape it gets back`] : []),
      ...(tool.outputSchema === undefined ? [] : OutputSchema.answers({ model: e.model, op, schema: tool.outputSchema, spans: e.spans, files: e.files })),
    ];
  });
});
