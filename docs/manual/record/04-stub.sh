# Section stub (chapter 4): one journey added by name. Sourced by ../capture.sh.
# One new journey by name: its stub has a blank cast, and the commands that read the model stop on it. The stack's own
# lines are left out, and this checkout's path is cut from the ones that stay.
ortho stub-one.txt add journey a-released-name-is-free-again
rec stub-one-check.txt "ortho check" -- bash -c "node '$repo/packages/cli/src/main.ts' check 2>&1 | grep -v '^ *at ' | sed 's#file://$repo/##g; s#$repo/##g' | head -12; exit \${PIPESTATUS[0]}"
restore
