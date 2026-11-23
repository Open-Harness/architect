// A route's path as segments. A segment is literal text, or literal text then `:name` (`@:handle` is "@" and then the handle) that runs to the
// segment's end. A parameter takes at least one character.
import type { Params } from "../types.ts";
import { decode } from "./decode.ts";

export interface Segment {
  readonly prefix: string;
  readonly param?: string;
}

export const segmentsOf = (path: string): ReadonlyArray<string> => path.split("/").filter((s) => s !== "");

export const parse = (path: string): ReadonlyArray<Segment> =>
  segmentsOf(path).map((s): Segment => {
    const colon = s.indexOf(":");
    return colon < 0 ? { prefix: s } : { prefix: s.slice(0, colon), param: s.slice(colon + 1) };
  });

/** How specific a pattern is: more literal segments win when two could match one address. */
export const literals = (segments: ReadonlyArray<Segment>): number => segments.filter((s) => s.param === undefined).length;

/** The parameters an address gives a pattern, or `undefined` when it does not fit. */
export const fit = (pattern: ReadonlyArray<Segment>, address: ReadonlyArray<string>): Params | undefined => {
  if (pattern.length !== address.length) return undefined;
  const params: Record<string, string> = {};
  for (const [i, segment] of pattern.entries()) {
    const text = decode(address[i] ?? "");
    if (text === undefined) return undefined;
    if (segment.param === undefined) {
      if (text !== segment.prefix) return undefined;
    } else {
      if (!text.startsWith(segment.prefix) || text.length === segment.prefix.length) return undefined;
      params[segment.param] = text.slice(segment.prefix.length);
    }
  }
  return params;
};

/** The address a pattern is for the given parameters, each percent-encoded; `undefined` when one is missing. */
export const fill = (pattern: ReadonlyArray<Segment>, params: Params): string | undefined => {
  const parts: string[] = [];
  for (const segment of pattern) {
    if (segment.param === undefined) parts.push(segment.prefix);
    else {
      const value = params[segment.param];
      if (value === undefined) return undefined;
      parts.push(`${segment.prefix}${encodeURIComponent(value)}`);
    }
  }
  return `/${parts.join("/")}`;
};
