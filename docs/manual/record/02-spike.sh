# Section spike (chapter 2). Sourced by ../capture.sh. It runs no ortho command: a spike is this repository's practice.
# ---- Spike what you doubt --------------------------------------------------------------------------------------------
# The run. rec runs inside the example, so the spike is named by its path from there; the reader runs it from the repository's root.
rec spike-run.txt "node spikes/pay-by-name-reversal/spike.mjs" -- node ../../spikes/pay-by-name-reversal/spike.mjs
# The page that is kept, as it stands.
copy_repo spike-readme.txt spikes/pay-by-name-reversal/README.md
# What the spike left behind: its two files.
rec spike-files.txt "ls spikes/pay-by-name-reversal" -- ls ../../spikes/pay-by-name-reversal
