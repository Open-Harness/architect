#!/usr/bin/env bash
# Compile the Club contract and generate its TypeScript binding. Needs scripts/install.sh to have run.
set -euo pipefail
cd "$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
source ./env.sh
mkdir -p client/src/generated
(cd contracts && aztec compile && aztec codegen target -o ../client/src/generated)
rm -f contracts/target/*.bak
