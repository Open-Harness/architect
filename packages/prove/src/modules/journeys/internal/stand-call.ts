// A journey's command to a mount's stand-in (G16-adapter-mounts call 4): `args` POSTed as JSON, once, to `/_stand/<command>`
// on the stand-in prove started for the mount. Only a 2xx JSON answer is an answer; a redirect is never followed.
import { Effect, Option, Schema } from "effect";

const parse = Schema.decodeUnknownOption(Schema.fromJsonString(Schema.Unknown));

export interface StandAnswer {
  /** What the stand-in answered with, or `undefined` when nothing was sent or nothing came back. */
  readonly status: number | undefined;
  readonly body: unknown;
  /** Why the step fails, naming the mount, the command and the status; `undefined` when the answer is one. */
  readonly failure: string | undefined;
}

/** Send `args` to the stand-in at `address`, the world's own for `mount`; with no address nothing is sent. */
export const sendCommand = (address: string | undefined, mount: string, command: string, args: unknown): Effect.Effect<StandAnswer> =>
  Effect.gen(function* () {
    const named = `the stand-in for mount ${mount}, command ${command}`;
    if (address === undefined) return { status: undefined, body: null, failure: `${named}: mount ${mount} has no stand-in running, so nothing was sent` };
    const sent = yield* Effect.promise(() =>
      fetch(`${address.replace(/\/+$/, "")}/_stand/${command}`, {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(args), redirect: "manual",
      }).then(
        (r) => r.text().then((text) => ({ status: r.status, text }), () => ({ status: r.status, text: "" })),
        (e: unknown) => ({ status: undefined, text: String(e) }),
      ));
    if (sent.status === undefined) return { status: undefined, body: null, failure: `${named}: couldn't be reached (${sent.text})` };
    const body = parse(sent.text);
    if (sent.status < 200 || sent.status > 299) {
      return { status: sent.status, body: Option.getOrElse(body, () => sent.text), failure: `${named}: answered ${sent.status}` };
    }
    if (Option.isNone(body)) return { status: sent.status, body: sent.text, failure: `${named}: answered ${sent.status} with no JSON` };
    return { status: sent.status, body: body.value, failure: undefined };
  });
