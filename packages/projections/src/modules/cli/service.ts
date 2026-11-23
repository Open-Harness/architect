import { Blueprint, Host, Ships } from "orthograph";
import { modelOf, within } from "#modules/names/service.js";
import { renderCli } from "./internal/cli.ts";

/** The command line (`generated/cli/`): `<project> <thing> <verb> --<field> ...`, one command per operation, built on the SDK. */
export const cli = Blueprint.projection({
  description: "The command line: a command per operation, flags typed from its fields, built on the SDK.",
  host: [Host.node],
  ships: [Ships.release],
  render: (input) => within(input, "cli", renderCli(modelOf(input), input.name)),
});
