// What the manual's films quote: real files of examples/plugged-in, and the runs docs/manual/capture.sh recorded in docs/manual/captures.
// A file or a recording that is gone fails the build, so a film cannot show what is not there.
import { readdirSync } from "node:fs";
import { join } from "node:path";

const quoted = [
  "blueprint/things/handle/thing.ts", "blueprint/things/handle/machine.ts", "blueprint/things/handle/invariants.ts", "blueprint/things/handle/errors.ts",
  "blueprint/things/handle/roles.ts", "blueprint/things/handle/verbs/claim.ts", "src/handle/claim.ts", "journeys/claim-a-handle.ts", "generated/docs/handle/claim.md",
];

export default ({ repo, read }) => {
  const app = join(repo, "examples/plugged-in"), captures = join(repo, "docs/manual/captures");
  // A recording opens with the command that was run, as `$ …`. A `.ts` recording is a file as it stood at that moment, under `# <path>`.
  const cap = Object.fromEntries(readdirSync(captures).map((f) => {
    const text = read(join(captures, f)), cut = text.indexOf("\n"), first = text.slice(0, cut), rest = text.slice(cut + 1);
    return [f.replace(/\.(txt|ts)$/, f.endsWith(".ts") ? "-ts" : ""), f.endsWith(".ts") ? { path: first.replace(/^# /, ""), text: rest } : { cmd: first.replace(/^\$ /, ""), out: rest.replace(/\n$/, "") }];
  }));
  const model = JSON.parse(read(join(app, "generated/model/model.json")));
  const count = (text, re) => text.split("\n").filter((l) => re.test(l)).length;
  const journeys = (out) => out.split("\n").filter((l) => l.startsWith("journey ")).map((l) => { const m = /^journey (.+) ([✔✘]) (\d+)\/(\d+) steps$/.exec(l); return { name: m[1], ok: m[2] === "✔", green: +m[3], steps: +m[4] }; });
  return {
    src: Object.fromEntries(quoted.map((f) => [f, read(join(app, f))])),
    cap,
    facts: {
      operations: Object.keys(model.operations), things: Object.keys(model.things),
      empty: { journeys: journeys(cap["prove-empty"].out), red: count(cap["prove-empty"].out, /^  ✘/), byDescription: count(cap["prove-empty"].out, /proved by the description$/) },
      full: { journeys: journeys(cap["prove"].out) },
      climb: [0, 1, 2].map((k) => journeys(cap[`climb-${k}-prove`].out)[0]),
    },
  };
};
