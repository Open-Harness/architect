#!/usr/bin/env node
// Generated from blueprint/projections/cli.ts. Do not edit.
// `plugged-in <thing> <verb> --<field> <value>`. Talks to PLUGGED_IN_URL, signed in with PLUGGED_IN_TOKEN when set.
import { NodeRuntime, NodeServices } from "@effect/platform-node";
import { Effect, Layer } from "effect";
import { CliOutput, Command } from "effect/cli";
import * as Sdk from "../../sdk/src/index.ts";
import { ExitCode } from "./output.ts";
import { claim as handleClaim } from "./handle/claim.ts";
import { release as handleRelease } from "./handle/release.ts";
import { resolve as handleResolve } from "./handle/resolve.ts";
import { add as linkAdd } from "./link/add.ts";
import { order as linkOrder } from "./link/order.ts";
import { remove as linkRemove } from "./link/remove.ts";
import { get as profileGet } from "./profile/get.ts";

// The release version is stamped in when the CLI is published (`ortho publish`); run from source, it says 0.0.0.
declare const ORTHO_VERSION: string | undefined;

const handle = Command.make("handle").pipe(Command.withSubcommands([handleClaim, handleRelease, handleResolve]));
const link = Command.make("link").pipe(Command.withSubcommands([linkAdd, linkOrder, linkRemove]));
const profile = Command.make("profile").pipe(Command.withSubcommands([profileGet]));

Command.make("plugged-in").pipe(
  Command.withSubcommands([handle, link, profile]),
  Command.run({ version: typeof ORTHO_VERSION === "string" ? ORTHO_VERSION : "0.0.0" }),
  Effect.provide(CliOutput.layer({ ...CliOutput.defaultFormatter(), formatVersion: (name, version) => `${name} ${version}` })),
  Effect.provide(Sdk.layer(process.env["PLUGGED_IN_URL"] ?? "http://127.0.0.1:8787", process.env["PLUGGED_IN_TOKEN"])),
  Effect.provide(Layer.succeed(ExitCode, ExitCode.of({ set: (code) => Effect.sync(() => void (process.exitCode = code)) }))),
  Effect.provide(NodeServices.layer),
  NodeRuntime.runMain,
);
