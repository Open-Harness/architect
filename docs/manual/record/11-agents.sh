# Section agents (chapter 11). Sourced by ../capture.sh. It only reads: nothing here runs the app or changes a file.
# ---- More than one agent ---------------------------------------------------------------------------------------------
# No ortho command does any of this, so the recordings are plain shell, read from the repository's root. They are here so
# the chapter's numbers are recorded and not typed: the goals that run, the claims each holds, and the size of each ratchet list.
at_root() { rec "$1" "$2" -- bash -c "cd '$repo' && $2"; }
at_root agents-goals.txt "grep '^| 1' design/goals/map.md | cut -d'|' -f2,3"
at_root agents-claims.txt "grep -o '| goal-[0-9]* |' docs/canon/status.md | sort | uniq -c"
at_root agents-ratchets.txt 'for d in e2e/*/expected-failing packages/*/expected-failing; do echo "$(ls $d | wc -l) $d"; done'
