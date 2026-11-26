# Goal 18, slice 7 (#1065): the stale READMEs. Red until the CLI README names every command it has (and only real ones, with real flags) and links getting started, seven built packages drop "Arrives in layer", and plugged-in's README stops saying it has empty handlers only.
test/readmes.test.ts > a package whose code is built does not say it is still to arrive > packages/generators/README.md has no "Arrives in layer" placeholder
test/readmes.test.ts > a package whose code is built does not say it is still to arrive > packages/host-cloudflare/README.md has no "Arrives in layer" placeholder
test/readmes.test.ts > a package whose code is built does not say it is still to arrive > packages/language-effect/README.md has no "Arrives in layer" placeholder
test/readmes.test.ts > a package whose code is built does not say it is still to arrive > packages/lint/README.md has no "Arrives in layer" placeholder
test/readmes.test.ts > a package whose code is built does not say it is still to arrive > packages/orthograph/README.md has no "Arrives in layer" placeholder
test/readmes.test.ts > a package whose code is built does not say it is still to arrive > packages/preset/README.md has no "Arrives in layer" placeholder
test/readmes.test.ts > a package whose code is built does not say it is still to arrive > packages/prove/README.md has no "Arrives in layer" placeholder
test/readmes.test.ts > the CLI's README says what the CLI does > does not say it has only `model`, or that the list is "so far"
test/readmes.test.ts > the CLI's README says what the CLI does > links the getting-started page by a link that resolves from the README's own folder
test/readmes.test.ts > the CLI's README says what the CLI does > names every top-level command `ortho --help` lists, as `ortho <command>`, and every `ortho …` it shows is a real command with its real flags
test/readmes.test.ts > the CLI's README says what the CLI does > points to --help for each command's flags
test/readmes.test.ts > the example's README matches its state > plugged-in's README does not say it has empty handlers only
