// A SHA-256 of a call's payload, kept beside the answer stored for its request key: pure, so it runs in any host and needs no clock.
const K = Array.from({ length: 64 }, (_, i) => {
  let n = 2, count = 0;
  const primes: Array<number> = [];
  for (; primes.length <= i; n++) { if (primes.every((p) => n % p !== 0)) primes.push(n); }
  count = primes[i]!;
  return Math.floor((Math.cbrt(count) % 1) * 2 ** 32) >>> 0;
});
const H0 = [2, 3, 5, 7, 11, 13, 17, 19].map((p) => Math.floor((Math.sqrt(p) % 1) * 2 ** 32) >>> 0);
const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));

export const sha256 = (text: string): string => {
  const bytes = new TextEncoder().encode(text);
  const padded = new Uint8Array(((bytes.length + 9 + 63) >> 6) << 6);
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 8, Math.floor((bytes.length * 8) / 2 ** 32));
  view.setUint32(padded.length - 4, (bytes.length * 8) >>> 0);
  const h = [...H0];
  const w = new Array<number>(64);
  for (let block = 0; block < padded.length; block += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(block + i * 4);
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15]!, 7) ^ rotr(w[i - 15]!, 18) ^ (w[i - 15]! >>> 3);
      const s1 = rotr(w[i - 2]!, 17) ^ rotr(w[i - 2]!, 19) ^ (w[i - 2]! >>> 10);
      w[i] = (w[i - 16]! + s0 + w[i - 7]! + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, hh] = h as [number, number, number, number, number, number, number, number];
    for (let i = 0; i < 64; i++) {
      const t1 = (hh + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & f) ^ (~e & g)) + K[i]! + w[i]!) >>> 0;
      const t2 = ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
      hh = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    [a, b, c, d, e, f, g, hh].forEach((v, i) => { h[i] = (h[i]! + v) >>> 0; });
  }
  return h.map((v) => v.toString(16).padStart(8, "0")).join("");
};

/** A payload as text with its keys in order, so the same payload always hashes the same. */
export const canonical = (value: unknown): string =>
  JSON.stringify(value, (_, v: unknown) =>
    typeof v === "bigint" ? v.toString()
    : v !== null && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
    : v);
