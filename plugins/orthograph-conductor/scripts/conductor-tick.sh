#!/bin/sh
# A scheduled wake for the conductor. Run it from the app's folder on a schedule (cron, launchd, a CI schedule, or a
# harness's own scheduler). It wakes the agent only when conductor-state.mjs says there is work it can do without the
# owner, so an idle project costs nothing.
#   CONDUCTOR_AGENT  the command that runs one agent turn from a prompt on stdin (default: claude -p)
#   e.g. crontab:  */30 * * * * cd /path/to/app && /path/to/orthograph-conductor/scripts/conductor-tick.sh >> .orthograph/conductor/tick.log 2>&1
set -eu
here=$(cd "$(dirname "$0")" && pwd)
why=$(node "$here/conductor-state.mjs" due) || { code=$?; [ "$code" = 3 ] && { echo "$why"; exit 0; }; exit "$code"; }
echo "$why"
printf '%s\n' "Use the conductor skill. You were woken on a schedule, not by the owner ($why). Do the tick: no questions to the owner in chat." | ${CONDUCTOR_AGENT:-claude -p}
