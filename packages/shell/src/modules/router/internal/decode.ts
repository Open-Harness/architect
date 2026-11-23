// A path segment, percent-decoded as UTF-8, or `undefined` when it is malformed: a lone `%`, a bad hex pair, or bytes that are not UTF-8.
// `decodeURIComponent` throws on these, and errors here are values, so the bytes are read by hand.
const PART = /%([0-9A-Fa-f]{2})|[^%]+|%/g;
const encoder = new TextEncoder();
// `ignoreBOM` keeps a leading U+FEFF in the text instead of swallowing it.
const decoder = new TextDecoder("utf-8", { ignoreBOM: true });

export const decode = (segment: string): string | undefined => {
  const bytes: number[] = [];
  for (const part of segment.matchAll(PART)) {
    const [text = "", hex] = part;
    if (hex !== undefined) bytes.push(Number.parseInt(hex, 16));
    else if (text === "%") return undefined;
    else bytes.push(...encoder.encode(text));
  }
  const raw = Uint8Array.from(bytes);
  const decoded = decoder.decode(raw);
  // Malformed bytes decode to U+FFFD, which no longer encodes to the bytes it came from; a U+FFFD that was in the bytes does. So the
  // check is the round trip, and `fatal: true` (which throws) is not needed.
  const again = encoder.encode(decoded);
  return again.length === raw.length && again.every((b, i) => b === raw[i]) ? decoded : undefined;
};
