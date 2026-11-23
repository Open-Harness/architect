#!/usr/bin/env bash
# Source from any directory. Tool versions and runtime files stay inside this spike.
SPIKE_ROOT="$(git rev-parse --show-toplevel)/spikes/aztec-club"
case "$(uname -s)-$(uname -m)" in
  Darwin-arm64) SPIKE_NODE_PLATFORM=darwin-arm64 ;;
  Linux-x86_64) SPIKE_NODE_PLATFORM=linux-x64 ;;
esac
export PATH="$SPIKE_ROOT/tools/node-v24.12.0-$SPIKE_NODE_PLATFORM/bin:$SPIKE_ROOT/tools:$SPIKE_ROOT/client/node_modules/.bin:$PATH"
export AZTEC_HOME="$SPIKE_ROOT/tools/aztec-home"
export FORGE_BIN="$SPIKE_ROOT/tools/forge"
export ANVIL_BIN="$SPIKE_ROOT/tools/anvil"
export LOG_LEVEL=info
