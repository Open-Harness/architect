import { BLOCKS, OUTPUTS, type CellId, type List, type Parsed, type SwitchedOn } from "../types.ts";

const isCell = (id: unknown): id is CellId => {
  if (typeof id !== "string") return false;
  const [block, output, ...rest] = id.split(".");
  return rest.length === 0 && (BLOCKS as ReadonlyArray<string>).includes(block ?? "") && (OUTPUTS as ReadonlyArray<string>).includes(output ?? "");
};

const entry = (value: unknown, at: number): { readonly entry?: SwitchedOn; readonly problems: ReadonlyArray<string> } => {
  const where = `cells[${at}]`;
  if (typeof value !== "object" || value === null) return { problems: [`${where} is not an object`] };
  const { cell, subjects, switchedBy } = value as Record<string, unknown>;
  const problems = [
    ...(isCell(cell) ? [] : [`${where}.cell ${JSON.stringify(cell)} is not <block>.<output> of K14's grid`]),
    ...(Array.isArray(subjects) && subjects.length > 0 && subjects.every((s) => typeof s === "string" && s !== "") ? [] : [`${where}.subjects must be a non-empty list of names`]),
    ...(typeof switchedBy === "string" && switchedBy !== "" ? [] : [`${where}.switchedBy must name the journey that touched it first`]),
  ];
  return problems.length > 0 ? { problems } : { entry: { cell: cell as CellId, subjects: subjects as ReadonlyArray<string>, switchedBy: switchedBy as string }, problems };
};

/** The list from its JSON, already parsed (the entry file reads and parses the text, so nothing here throws). */
export const parseList = (json: unknown): Parsed<List> => {
  const cells = typeof json === "object" && json !== null ? (json as { readonly cells?: unknown }).cells : undefined;
  if (!Array.isArray(cells)) return { ok: false, problems: ['the list needs a "cells" array'] };
  const read = cells.map(entry);
  const problems = read.flatMap((r) => r.problems);
  const seen = new Set<string>();
  const duplicates = read.flatMap((r) => (r.entry === undefined ? [] : seen.has(r.entry.cell) ? [`cell ${r.entry.cell} is listed twice`] : (seen.add(r.entry.cell), [])));
  return problems.length + duplicates.length > 0
    ? { ok: false, problems: [...problems, ...duplicates] }
    : { ok: true, value: { cells: read.flatMap((r) => (r.entry === undefined ? [] : [r.entry])) } };
};

/** Adds, never removes: the first journey to touch a cell stays its `switchedBy`. */
export const switchOn = (list: List, entries: ReadonlyArray<SwitchedOn>): List => {
  const byCell = new Map(list.cells.map((c) => [c.cell, c] as const));
  for (const added of entries) {
    const have = byCell.get(added.cell);
    byCell.set(added.cell, have === undefined ? added : { ...have, subjects: [...new Set([...have.subjects, ...added.subjects])] });
  }
  return { cells: [...byCell.values()].sort((a, b) => a.cell.localeCompare(b.cell)) };
};
