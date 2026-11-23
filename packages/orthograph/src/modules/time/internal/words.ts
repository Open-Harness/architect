// The words a span is written in.
import type { ReadSpan } from "../types.ts";

const SPAN = /^(\d+) (second|minute|hour|day|week|month|year)s?$/;

export const readSpan = (span: string): ReadSpan | undefined => {
  const m = SPAN.exec(span);
  return m ? { count: Number(m[1]), unit: m[2] as ReadSpan["unit"] } : undefined;
};
