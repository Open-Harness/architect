import { classText, code, endpoints, exportedNames, exportedTypes, exportedValues, objectRows } from "./internal/code.ts";
import { typeKinds } from "./internal/kinds.ts";
import { htmlHeadings, htmlItems, htmlLines, htmlRecords, htmlRows, htmlSection, htmlText, portalOwn } from "./internal/html.ts";
import { hasName, mdBullets, mdRecords, mdRows, mdSection, mdTitle, plain } from "./internal/markdown.ts";
import type { ReadingApi } from "./types.ts";

const finding = (problems: ReadonlyArray<string>) => ({ ok: problems.length === 0, why: problems });

export const Reading: ReadingApi = {
  finding,
  over: (cell, noun, find, problems) => ({
    cell,
    judge: (subject, evidence) => {
      const found = find(evidence, subject);
      return found === undefined ? finding([`the model has no ${noun} ${subject}`]) : finding(problems(found, evidence, subject));
    },
  }),
  typeKinds, mdSection, mdTitle, mdRows, mdRecords, mdBullets, htmlRecords, htmlLines, htmlHeadings, exportedTypes, exportedValues, exportedNames, classText, objectRows, endpoints, code, plain, hasName,
  portalOwn, htmlSection, htmlRows, htmlItems, htmlText,
  proved: (prove, line) =>
    prove === undefined ? [`no prove run was read, so "${line}" is not known`]
    : prove.lines.some((l) => l === `${line} ✔` || l.startsWith(`${line} ✔ `)) ? [] : [`prove did not report "${line} ✔"`],
  spansNamed: (spans, name) => spans.filter((s) => s.name === name),
};
