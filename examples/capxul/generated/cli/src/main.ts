#!/usr/bin/env node
// Generated from the blueprint. Do not edit.
// `capxul <thing> <verb> --<field> <value>`. Talks to CAPXUL_URL, signed in with CAPXUL_TOKEN when set.
import { NodeRuntime, NodeServices } from "@effect/platform-node";
import { Effect, Layer } from "effect";
import { CliOutput, Command } from "effect/cli";
import * as Sdk from "../../sdk/src/index.ts";
import { ExitCode } from "./output.ts";
import { create as companyCreate } from "./company/create.ts";
import { get as companyGet } from "./company/get.ts";

// The release version is stamped in when the CLI is published (`ortho publish`); run from source, it says 0.0.0.
declare const ORTHO_VERSION: string | undefined;

const company = Command.make("company").pipe(Command.withSubcommands([companyCreate, companyGet]));

Command.make("capxul").pipe(
  Command.withSubcommands([company]),
  Command.run({ version: typeof ORTHO_VERSION === "string" ? ORTHO_VERSION : "0.0.0" }),
  Effect.provide(CliOutput.layer({ ...CliOutput.defaultFormatter(), formatVersion: (name, version) => `${name} ${version}` })),
  Effect.provide(Sdk.layer(process.env["CAPXUL_URL"] ?? "http://127.0.0.1:8787", process.env["CAPXUL_TOKEN"])),
  Effect.provide(Layer.succeed(ExitCode, ExitCode.of({ set: (code) => Effect.sync(() => void (process.exitCode = code)) }))),
  Effect.provide(NodeServices.layer),
  NodeRuntime.runMain,
);
