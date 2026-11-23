#!/usr/bin/env bash
# Goal 3's wallet demo (M1.29): `acme wallet create && acme wallet send` confirms on Anvil from the CLI.
#
# acme is copied to a scratch folder, @orthograph/wallets (built here) is installed in it and mounted with `ortho add
# feature`, and Anvil runs as a plain process (always --silent, loopback, no dev accounts, Foundry on the PATH).
# The wallet's key is made by `acme wallet create` and kept in an encrypted keystore file; the demo funds the new account
# over RPC (the chain is its own, local) and no key is ever printed. The passphrase is made here and never shown.
# Everything is made in a scratch folder, and Anvil is stopped, when the script ends.
set -euo pipefail
repo="$(cd "$(dirname "$0")/../.." && pwd)"
work="$(mktemp -d "${TMPDIR:-/tmp}/ortho-wallet-demo-XXXXXX")"
anvil_pid=""
cleanup() { [ -n "$anvil_pid" ] && kill "$anvil_pid" 2>/dev/null && wait "$anvil_pid" 2>/dev/null || true; rm -rf "$work"; }
trap cleanup EXIT
say() { printf '\n\033[1m$ %s\033[0m\n' "$*"; }
command -v anvil >/dev/null || { echo "anvil (Foundry) is not on the PATH"; exit 1; }

# 1. The plugin is JavaScript (M1-plugins section 1): build it as `nx build wallets` does.
"$repo/node_modules/.bin/tsc" -p "$repo/packages/wallets/tsconfig.build.json"

# 2. acme, in a folder of its own, with the wallet installed as a package manager would (not mounted yet).
root="$work/acme"; mkdir -p "$root/node_modules/@orthograph/.bin" "$root/node_modules/.bin"
for part in ortho.config.ts blueprint generated src journeys package.json; do cp -R "$repo/examples/acme/$part" "$root/"; done
rm -rf "$root/node_modules/@orthograph/.bin"
for entry in "$repo/examples/acme/node_modules/"*; do
  [ "$(basename "$entry")" = "@orthograph" ] || ln -s "$entry" "$root/node_modules/$(basename "$entry")"
done
for entry in "$repo/examples/acme/node_modules/@orthograph/"*; do ln -s "$entry" "$root/node_modules/@orthograph/$(basename "$entry")"; done
ln -s "$repo/packages/wallets" "$root/node_modules/@orthograph/wallets"
for tool in tsc oxlint; do printf '#!/bin/sh\nexec "%s" "$@"\n' "$repo/node_modules/.bin/$tool" > "$root/node_modules/.bin/$tool"; chmod +x "$root/node_modules/.bin/$tool"; done
printf '{ "extends": "%s", "compilerOptions": { "typeRoots": ["%s", "%s"] }, "include": ["blueprint/**/*.ts", "generated/**/*.ts", "src/**/*.ts", "journeys/**/*.ts"] }\n' \
  "$repo/examples/acme/tsconfig.json" "$repo/node_modules/@types" "$repo/examples/acme/node_modules" > "$root/tsconfig.json"
node -e 'const f=process.argv[1],m=JSON.parse(require("fs").readFileSync(f,"utf8"));m.dependencies={...m.dependencies,"@orthograph/wallets":"0.0.0"};require("fs").writeFileSync(f,JSON.stringify(m,null,2)+"\n")' "$root/package.json"

# 3. Mount it, and generate: the wallet's five operations are in the CLI.
ortho() { node "$repo/packages/cli/src/main.ts" "$@" --root "$root"; }
say "ortho add feature @orthograph/wallets"; ortho add feature @orthograph/wallets
say "ortho generate"; ortho generate >/dev/null; echo "generated: the wallet's five operations are in the SDK, the CLI, the docs and the portal"
say "ortho check"; ortho check
acme() { node "$root/generated/cli/src/main.ts" "$@"; }

# 4. The chain: Anvil as a process, silent, on a free loopback port, with no accounts of its own.
port="$(node -e 'const s=require("net").createServer().listen(0,"127.0.0.1",()=>{console.log(s.address().port);s.close()})')"
rpc="http://127.0.0.1:$port"
say "anvil --silent --host 127.0.0.1 --port <free> --chain-id 31337 --accounts 0"
anvil --silent --host 127.0.0.1 --port "$port" --chain-id 31337 --accounts 0 &
anvil_pid=$!
curl -s --retry 50 --retry-delay 0 --retry-connrefused -o /dev/null -X POST -H 'content-type: application/json' --data '{"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}' "$rpc"
rpcCall() { curl -s -X POST -H 'content-type: application/json' --data "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"$1\",\"params\":$2}" "$rpc"; }
echo "eth_chainId $(rpcCall eth_chainId '[]' | node -e 'console.log(JSON.parse(require("fs").readFileSync(0,"utf8")).result)')"

# 5. The wallet's host settings: the chain, where the encrypted keystore is, and what locks it (never shown).
export ORTHO_WALLET_CHAIN=eip155:31337 ORTHO_WALLET_RPC_URL="$rpc" ORTHO_WALLET_HOME="$work/wallets"
ORTHO_WALLET_PASSPHRASE="$(node -e 'console.log(require("crypto").randomBytes(24).toString("hex"))')"; export ORTHO_WALLET_PASSPHRASE

say "acme wallet create --signer node --label demo --json"
made="$(acme wallet create --signer node --label demo --json)"; echo "$made"
say "acme wallet create --signer node --label payee --json"
payee="$(acme wallet create --signer node --label payee --json)"; echo "$payee"
field() { node -e 'console.log(JSON.parse(process.argv[1])[process.argv[2]])' "$1" "$2"; }
account="$(field "$made" account)"; to="$(field "$payee" account)"
echo; echo "the keystore holds encrypted files, no plain key:"; ls "$ORTHO_WALLET_HOME"
say "acme wallet keys --signer node"; acme wallet keys --signer node

# 6. Fund the new account on the local chain (anvil_setBalance: 100 ether), then send.
rpcCall anvil_setBalance "[\"${account##*:}\",\"0x56bc75e2d63100000\"]" >/dev/null
balance() { node -e 'console.log(BigInt(JSON.parse(process.argv[1]).result).toString())' "$(rpcCall eth_getBalance "[\"${1##*:}\",\"latest\"]")"; }
echo "payee balance before: $(balance "$to") wei"
say "acme wallet send --signer node --label demo --to <payee> --value 1000000000000000 --json"
acme wallet send --signer node --label demo --to "$to" --value 1000000000000000 --json
echo "payee balance after:  $(balance "$to") wei"

# 7. A transfer the chain refuses is refused before anything is signed, and uses no nonce.
say "acme wallet send --signer node --label demo --to <payee> --value 1000000000000000000000000000000   (expected exit 63)"
set +e; acme wallet send --signer node --label demo --to "$to" --value 1000000000000000000000000000000; code=$?; set -e
echo "exit $code"
say "acme wallet send --signer node --label demo --to <payee> --value 2000 --json   (the second nonce, 1)"
acme wallet send --signer node --label demo --to "$to" --value 2000 --json

# 8. Without the passphrase the keystore is locked: keys are listed and nothing is signed.
say "acme wallet sign --signer node --label demo --message hello   (no passphrase, expected exit 61)"
set +e; env -u ORTHO_WALLET_PASSPHRASE node "$root/generated/cli/src/main.ts" wallet sign --signer node --label demo --message hello; code=$?; set -e
echo "exit $code"
