#!/usr/bin/env bash
# Throwaway. Fetches the outside data and the publications into a scratch folder OUTSIDE the repository,
# and converts open-withholding's YAML to one JSON file the calculator reads. Nothing outside is run.
# Usage: calc/fetch.sh <scratch-dir>
set -euo pipefail
out="${1:?scratch dir}"
mkdir -p "$out/src" "$out/pubs"
cd "$out/src"
[ -d ow ] || git clone -q https://github.com/open-withholding/open-withholding ow
[ -d nk ] || git clone -q https://github.com/Nyaksik/us-payroll-tax-tables nk
git -C ow checkout -q 4a0e67e9976384bbea712673b93f464dfcca5542
git -C nk checkout -q ab663307bbc38f5c133b8dc725928445fcf4a0aa
cd "$out/pubs"
get() { [ -s "$1" ] || curl -sSL -A "Mozilla/5.0" -o "$1" "$2"; }
get p15t.pdf https://www.irs.gov/pub/irs-pdf/p15t.pdf
get p15.pdf https://www.irs.gov/pub/irs-pdf/p15.pdf
get ca-26methb.pdf https://edd.ca.gov/siteassets/files/pdf_pub_ctr/26methb.pdf
get ny-nys50tnys.pdf https://www.tax.ny.gov/pdf/publications/withholding/nys50_t_nys.pdf
get nj-njwt.pdf https://www.nj.gov/treasury/taxation/pdf/current/njwt.pdf
get il-700t.pdf https://tax.illinois.gov/content/dam/soi/en/web/tax/forms/withholding/documents/currentyear/il-700-t.pdf
get ga-sep.pdf https://dor.georgia.gov/document/document/2026-employers-tax-guide-updated-september-2026/download
for f in *.pdf; do pdftotext -layout "$f" "${f%.pdf}.txt" || echo "unreadable: $f"; done
# Our own converter, run in isolated mode on their data (data only, no code of theirs).
python3 -I - "$out/src/ow/data/us" "$out/ow.json" <<'EOF'
import sys, os, json, yaml
root, dst = sys.argv[1], sys.argv[2]
files = {}
for d, _, fs in os.walk(root):
    for f in fs:
        if f.endswith('.yaml'):
            p = os.path.join(d, f)
            files[os.path.relpath(p, root)] = yaml.safe_load(open(p))
json.dump(files, open(dst, 'w'), default=str)
print(len(files), 'parameter files ->', dst)
EOF
