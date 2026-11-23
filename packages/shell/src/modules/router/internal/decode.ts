// A path segment, percent-decoded as UTF-8, or `undefined` when it is malformed: a lone `%`, a bad hex pair, or bytes that are not UTF-8.
// `decodeURIComponent` throws on these, and errors here are values, so the bytes are read by hand.
const PART = /%([0-9A-Fa-f]{2})|[^%]+|%/g;
const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8");

export const decode = (segment: string): string | undefined => {
  const bytes: number[] = [];
  for (const part of segment.matchAll(PART)) {
    const [text = "", hex] = part;
    if (hex !== undefined) bytes.push(Number.parseInt(hex, 16));
    else if (text === "%") return undefined;
    else bytes.push(...encoder.encode(text));
  }
  const decoded = decoder.decode(Uint8Array.from(bytes));
  return decoded.includes("�") ? undefined : decoded;
};
