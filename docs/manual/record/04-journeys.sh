# Section journeys (chapter 4). Sourced by ../capture.sh.
# ---- Say what done means ---------------------------------------------------------------------------------------------
# The designer's last step: a stub for each path, role and declared error of one thing. Each is a file of blanks.
ortho stubs.txt add journeys handle
copy stub-refused-not-owner.ts.txt blueprint/journeys/handle-release-refused-not-handleOwner.ts
ortho stubs-check.txt check
restore
# The journeys as they stand, run on the scaffolded handlers: red on purpose.
ortho prove-empty.txt prove --empty
ortho prove-empty-one.txt prove --empty --only "claim a handle"
