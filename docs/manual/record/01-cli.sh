# Section cli: the command line's own tree. Sourced by ../capture.sh, which gives it rec, ortho, copy, restore, $app, $out, $keep, $repo, $here.
# The command line's own tree, read from its --help: what check.mjs holds every written command against.
node "$here/cli-tree.mjs" > "$out/cli.json"
