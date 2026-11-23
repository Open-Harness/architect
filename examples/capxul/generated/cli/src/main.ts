#!/usr/bin/env node
// Generated from the blueprint. Do not edit.
// `capxul <thing> <verb> --<field> <value>`. Talks to CAPXUL_URL, signed in with CAPXUL_TOKEN when set.
import { NodeRuntime, NodeServices } from "@effect/platform-node";
import { Effect, Layer } from "effect";
import { CliOutput, Command } from "effect/cli";
import * as Sdk from "../../sdk/src/index.ts";
import { ExitCode } from "./output.ts";
import { close as bankAccountClose } from "./bank-account/close.ts";
import { get as bankAccountGet } from "./bank-account/get.ts";
import { open as bankAccountOpen } from "./bank-account/open.ts";
import { approve as bridgeBusinessApprove } from "./bridge-business/approve.ts";
import { get as bridgeBusinessGet } from "./bridge-business/get.ts";
import { reject as bridgeBusinessReject } from "./bridge-business/reject.ts";
import { start as bridgeBusinessStart } from "./bridge-business/start.ts";
import { approve as bridgeIndividualApprove } from "./bridge-individual/approve.ts";
import { get as bridgeIndividualGet } from "./bridge-individual/get.ts";
import { reject as bridgeIndividualReject } from "./bridge-individual/reject.ts";
import { start as bridgeIndividualStart } from "./bridge-individual/start.ts";
import { create as companyCreate } from "./company/create.ts";
import { get as companyGet } from "./company/get.ts";

// The release version is stamped in when the CLI is published (`ortho publish`); run from source, it says 0.0.0.
declare const ORTHO_VERSION: string | undefined;

const bankAccount = Command.make("bank-account").pipe(Command.withSubcommands([bankAccountClose, bankAccountGet, bankAccountOpen]));
const bridgeBusiness = Command.make("bridge-business").pipe(Command.withSubcommands([bridgeBusinessApprove, bridgeBusinessGet, bridgeBusinessReject, bridgeBusinessStart]));
const bridgeIndividual = Command.make("bridge-individual").pipe(Command.withSubcommands([bridgeIndividualApprove, bridgeIndividualGet, bridgeIndividualReject, bridgeIndividualStart]));
const company = Command.make("company").pipe(Command.withSubcommands([companyCreate, companyGet]));

Command.make("capxul").pipe(
  Command.withSubcommands([bankAccount, bridgeBusiness, bridgeIndividual, company]),
  Command.run({ version: typeof ORTHO_VERSION === "string" ? ORTHO_VERSION : "0.0.0" }),
  Effect.provide(CliOutput.layer({ ...CliOutput.defaultFormatter(), formatVersion: (name, version) => `${name} ${version}` })),
  Effect.provide(Sdk.layer(process.env["CAPXUL_URL"] ?? "http://127.0.0.1:8787", process.env["CAPXUL_TOKEN"])),
  Effect.provide(Layer.succeed(ExitCode, ExitCode.of({ set: (code) => Effect.sync(() => void (process.exitCode = code)) }))),
  Effect.provide(NodeServices.layer),
  NodeRuntime.runMain,
);
