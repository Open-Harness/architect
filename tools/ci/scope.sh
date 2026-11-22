#!/usr/bin/env bash
# Is this run the fast gate of a pull request into a goal branch? CI's `changes` job runs this
# (design/decisions/CI-integration.md, B1). A pull request whose base is a goal branch other than goal/stage-1 runs only
# `check` (check-static and prove-tests), `builder-paths` and the goal's own e2e suite; every other required job passes
# without running its steps. The full suite runs when the goal lands in goal/stage-1.
#   tools/ci/scope.sh <event> <base ref>
# Prints `fast=true` or `fast=false` (append it to $GITHUB_OUTPUT) and exits 0. Only a pull_request event can be fast; a push,
# a pull request into main, goal/stage-1, a layer or a milestone branch, and an empty base all run everything.
set -euo pipefail

event="${1:?usage: scope.sh <event> <base ref>}"
base="${2-}"

fast=false
if [ "$event" = pull_request ]; then
  case "$base" in
    goal/stage-1) ;;
    goal/?*) fast=true ;;
  esac
fi
echo "fast=$fast"
# probe
