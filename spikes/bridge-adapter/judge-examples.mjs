// Judges every example Bridge's description publishes for a JSON answer, unchanged, against that answer's own schema,
// with the judge the generated adapter carries (src/runtime/json-schema.ts). An example it refuses is an answer shaped like
// Bridge's own documentation that the generated client would refuse as AnswerRefused.
// Usage: node judge-examples.mjs <plugins/bridge/src/runtime/json-schema.ts> <bridge.json>
import { readFileSync } from "node:fs";

const [judgePath, specPath] = process.argv.slice(2);
const { problems } = await import(judgePath);
const spec = JSON.parse(readFileSync(specPath, "utf8"));
const at = (ref) => ref.replace(/^#\//, "").split("/").reduce((n, k) => n?.[k.replace(/~1/g, "/").replace(/~0/g, "~")], spec);
const components = new Proxy({}, { get: (_, ref) => (typeof ref === "string" ? at(ref) : undefined) });
const CAPXUL_FIRST = /^\/(customers(\/\{customerID\})?|kyc_links.*|customers\/\{customerID\}\/virtual_accounts.*|transfers.*)$/;

let total = 0;
const refused = [];
for (const [path, item] of Object.entries(spec.paths)) {
  for (const [method, op] of Object.entries(item)) {
    // only success answers: the client judges those, and hands a failure's body back as it came
    for (const [status, response] of Object.entries(op?.responses ?? {}).filter(([s]) => s.startsWith("2"))) {
      const content = (response.$ref ? at(response.$ref) : response).content?.["application/json"];
      if (content?.schema === undefined) continue;
      const found = Object.entries(content.examples ?? {}).map(([name, e]) => [name, (e.$ref ? at(e.$ref) : e).value]);
      if (content.example !== undefined) found.push(["example", content.example]);
      for (const [name, value] of found) {
        if (value === undefined) continue;
        total += 1;
        const why = problems(components, content.schema, value);
        if (why.length > 0) refused.push({ call: `${method.toUpperCase()} ${path} ${status}`, path, name, why: why[0] });
      }
    }
  }
}
const first = refused.filter((r) => CAPXUL_FIRST.test(r.path));
console.log(`${refused.length} of ${total} published examples of a success answer don't fit their own schema, in ${new Set(refused.map((r) => r.call)).size} answers`);
console.log(`of them, in the calls Capxul needs first (customers, KYC links, virtual accounts, transfers): ${first.length}`);
const byCall = new Map();
for (const r of first) byCall.set(r.call, [...(byCall.get(r.call) ?? []), r]);
for (const [call, rs] of byCall) console.log(`  ${call}: ${rs.length} (${rs[0].name}: ${rs[0].why})`);
