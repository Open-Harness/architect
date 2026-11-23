#!/usr/bin/env bash
set -euo pipefail
spike_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$spike_dir"
mkdir -p tools runtime/tmp
case "$(uname -s)-$(uname -m)" in
  Darwin-arm64) node_platform=darwin-arm64; noir_platform=aarch64-apple-darwin; foundry_platform=darwin_arm64 ;;
  Linux-x86_64) node_platform=linux-x64; noir_platform=x86_64-unknown-linux-gnu; foundry_platform=linux_amd64 ;;
  *) echo 'Unsupported platform for this reproduction script'; exit 1 ;;
esac
if [ ! -x "tools/node-v24.12.0-$node_platform/bin/node" ]; then
  curl -fsSL "https://nodejs.org/dist/v24.12.0/node-v24.12.0-$node_platform.tar.gz" | tar xz -C tools
fi
if [ ! -x tools/nargo ]; then
  curl -fsSL "https://github.com/noir-lang/noir/releases/download/v1.0.0-beta.25/nargo-$noir_platform.tar.gz" | tar xz -C tools
fi
if [ ! -x tools/forge ]; then
  curl -fsSL "https://github.com/foundry-rs/foundry/releases/download/v1.4.1/foundry_v1.4.1_$foundry_platform.tar.gz" | tar xz -C tools
fi
if [ ! -d tools/aztec-packages ]; then
  git clone --depth 1 --filter=blob:none --sparse --branch v5.3.0 https://github.com/AztecProtocol/aztec-packages.git tools/aztec-packages
  git -C tools/aztec-packages sparse-checkout set noir-projects
fi
for library in sha256 poseidon; do
  if [ ! -d "tools/$library" ]; then
    git clone --depth 1 --branch v0.3.0 "https://github.com/noir-lang/$library.git" "tools/$library"
  fi
done
python3 scripts/local-deps.py
export PATH="$spike_dir/tools/node-v24.12.0-$node_platform/bin:$spike_dir/tools:$PATH"
npm ci --prefix client --cache "$spike_dir/tools/npm-cache"
echo 'Installed pinned local toolchain. No shell profile was changed.'
