#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

pin() {
  node -p "require('./versions.json').$1"
}

[[ $(node --version) == "v$(pin tools.node.version)" ]]
[[ $(npm --version) == "$(pin tools.npm.version)" ]]
scratch=$(mktemp -d)
trap 'rm -rf "$scratch"' EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
npm ci --ignore-scripts --no-audit --no-fund --no-update-notifier --cache "$scratch/npm"

for package in hats-protocol solbase forge-std; do
  mkdir -p "node_modules/$package"
  archive="$scratch/$package.tar.gz"
  curl --fail --silent --show-error --location --max-time 60 \
    "$(pin "git['$package'].archive")$(pin "git['$package'].commit")" -o "$archive"
  echo "$(pin "git['$package'].sha256")  $archive" | shasum -a 256 -c -
  tar xzf "$archive" --strip-components=1 -C "node_modules/$package"
done

version=$(pin tools.foundry.version)
commit=$(pin tools.foundry.commit)
mkdir -p node_modules/.bin
if forge --version 2>/dev/null | grep -qF "$commit" && anvil --version 2>/dev/null | grep -qF "$commit"; then
  ln -sf "$(command -v forge)" node_modules/.bin/forge
  ln -sf "$(command -v anvil)" node_modules/.bin/anvil
else
  os=$(uname -s | tr '[:upper:]' '[:lower:]')
  case $(uname -m) in
    x86_64) arch=amd64 ;;
    arm64|aarch64) arch=arm64 ;;
    *) echo 'Unsupported Foundry architecture' >&2; exit 1 ;;
  esac
  platform="${os}_${arch}"
  archive="foundry_v${version}_${platform}.tar.gz"
  sha=$(pin "tools.foundry.sha256['$platform']")
  curl --fail --silent --show-error --location --max-time 120 \
    "https://github.com/foundry-rs/foundry/releases/download/v$version/$archive" -o "$scratch/$archive"
  echo "$sha  $scratch/$archive" | shasum -a 256 -c -
  tar xzf "$scratch/$archive" -C node_modules/.bin forge anvil
fi

solc_version=$(pin tools.solc.version)
case $(uname -s)/$(uname -m) in
  Darwin/*) asset=solc-macos ;;
  Linux/x86_64) asset=solc-static-linux ;;
  *) echo 'The pinned native solc supports macOS and Linux x86-64 in this runner' >&2; exit 1 ;;
esac
curl --fail --silent --show-error --location --max-time 180 \
  "https://github.com/argotorg/solidity/releases/download/v$solc_version/$asset" -o node_modules/.bin/solc
chmod +x node_modules/.bin/solc
node_modules/.bin/solc --version | grep -F "$solc_version+commit.$(pin tools.solc.commit)"
