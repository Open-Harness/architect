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
get nj-withholdingtables.pdf https://www.nj.gov/treasury/taxation/pdf/withholdingtables.pdf
get ga-sep.pdf https://dor.georgia.gov/document/document/2026-employers-tax-guide-updated-september-2026/download
# Fail loudly if an agency has replaced a document since the spike read it (the first seven are the sha256s
# open-withholding cites; Georgia's is the copy this spike read on 26 November 2026).
sha256sum -c - <<'SUMS'
31b3e2428628e8d2e40f6266c2c8f1b9b0b6ccd24607895f9b3be3d9d306d3fb  p15t.pdf
b46c3622439d8521e3a0faca4cd5b5ece3451b526f65f06a5e38d5c9f804c88b  p15.pdf
145b570a333f22ff0b4c230ef8ee04bd6f5dc89f8351eb134754b4820f6c7047  ca-26methb.pdf
e1c2b3440572a10019efe8d8e4d727474c55afb37dd5d18a6a73b94463baf3e8  ny-nys50tnys.pdf
0fbd45b2c7e9f5d8858ed4008c1436739e7a3ba655a823516ca4be8041cf01e9  nj-njwt.pdf
e7480d096b6126f49181c9f5e9b04a15b1542ca79e7480d01e4a3d6bb359f3f8  nj-withholdingtables.pdf
f8f05eda8025bc8b80b7dee5fa9a69af04e2c32b3320386ace7027b5fc6d635e  il-700t.pdf
d63c2828c91a0aaa0d3c80e9e97b13f173aee00573d77c2e3cb54895c481ea58  ga-sep.pdf
SUMS
for f in *.pdf; do pdftotext -layout "$f" "${f%.pdf}.txt" || echo "unreadable: $f"; done
# Not fetched by this script, read by hand: Delaware's Employer's Guide section 17,
# https://revenue.delaware.gov/employers-guide-withholding-regulations-employers-duties/ (an HTML page, so no stable
# sha256; its tax computation table is headed "Effective January 1, 2025"; the site answers
# "Request Rejected" to curl; read through a web fetch tool on 26 November 2026), and NJ-WT page 25, which is an
# image with no text layer (rendered with pdftoppm -f 25 -l 25 nj-njwt.pdf and read by eye).
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
