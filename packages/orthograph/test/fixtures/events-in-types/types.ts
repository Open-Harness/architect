// Planted fixture (E1, #1165, design/decisions/CX-events-in.md call 4). Compiled on its own by test/events-in-types.test.ts, never by the package's
// typecheck. The plain lines compile; each `@ts-expect-error` line has an error, so a line that stops failing fails the test (TS2578).
// What S2 writes: an adapter's chain event, taken by an operation's `on:` with plain `Blueprint.on` and no cast, its map given the decoded payload, and
// its wire name given once by generated code. Written by the checks author; a builder never edits it.
import { Schema } from "effect";
import { Blueprint, type On } from "../../../src/index.ts";
import { EventNames } from "../../../src/server.ts";

const Transfer = Blueprint.incoming(Schema.Struct({ from: Schema.String, to: Schema.String, value: Schema.BigIntFromString }));
const TransferCorrected = Blueprint.incoming(Schema.Struct({ from: Schema.String, to: Schema.String, value: Schema.BigIntFromString, wasConfirmed: Schema.Boolean }));
const token = Blueprint.adapter({ description: "A test token.", events: { Transfer, TransferCorrected } });

// The map is given the decoded payload: `value` is a bigint, `wasConfirmed` a boolean.
export const record = Blueprint.on(token.events.Transfer, (e) => ({ to: e.to, value: e.value + 1n, payer: e.from }));
export const undo = Blueprint.on(token.events.TransferCorrected, (e) => ({ to: e.to, value: e.value, undone: e.wasConfirmed === true }));
// An operation's `on:` list takes them.
export const hops: ReadonlyArray<On> = [record, undo];
// Generated code gives each its wire name.
EventNames.name(token.events.Transfer, "Token.Transfer");
EventNames.name(token.events.TransferCorrected, "Token.TransferCorrected");

// @ts-expect-error a field the event does not have
Blueprint.on(token.events.Transfer, (e) => ({ to: e.recipient }));
// @ts-expect-error `value` is a bigint, not the string on the wire
Blueprint.on(token.events.Transfer, (e) => ({ to: e.value.toUpperCase() }));
// @ts-expect-error `wasConfirmed` is the correction's, not the event's
Blueprint.on(token.events.Transfer, (e) => ({ undone: e.wasConfirmed }));
