// Preloaded by test/help-tree.ts (`node --import`), never by `ortho` itself: when the CLI would print a command's help, it
// prints the help's data instead, one line `HELPDOC <json>`: the description, the flags, the arguments and the subcommands
// exactly as `src/main.ts` declared them (effect/cli's HelpDoc, its Option descriptions written as strings, `""` for none).
// So the help-text checks judge the command tree, not the coloured text a formatter makes of it. Every other event (an
// error, a version) is presented as usual. Slice 7 of Goal 18 (#1065).
// It replaces only the default Presenter. A build that provides its own Presenter layer (CliOutput.layerPresenter) blinds
// the hook: no `HELPDOC` line is printed, every page reads as found: false, and the help-text tests fail rather than pass.
import { Console, Option } from "effect";
import { CliOutput } from "effect/cli";

const text = (o: Option.Option<string>): string => Option.getOrElse(o, () => "");
const presenter: CliOutput.Presenter = {
  present: (event) =>
    event._tag === "Help"
      ? Console.log(
          `HELPDOC ${JSON.stringify({
            commandPath: event.helpDoc.commandPath ?? [],
            usage: event.helpDoc.usage,
            description: event.helpDoc.description,
            flags: event.helpDoc.flags.map((f) => ({ name: f.name, aliases: f.aliases, type: f.type, description: text(f.description) })),
            args: (event.helpDoc.args ?? []).map((a) => ({ name: a.name, type: a.type, description: text(a.description) })),
            subcommands: (event.helpDoc.subcommands ?? []).flatMap((g) =>
              g.commands.map((c) => ({ name: c.name, alias: c.alias, shortDescription: c.shortDescription, description: c.description })),
            ),
          })}`,
        )
      : CliOutput.defaultPresenter.present(event),
};
// `Presenter` is a Context.Reference: its default is read the first time a run asks for it, after this module has run.
(CliOutput.Presenter as unknown as { defaultValue: () => CliOutput.Presenter }).defaultValue = () => presenter;
