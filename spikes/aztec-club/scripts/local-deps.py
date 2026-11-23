from pathlib import Path
import os, re
root = Path(__file__).resolve().parents[1]
for manifest in (root / 'tools/aztec-packages/noir-projects').rglob('Nargo.toml'):
    source = manifest.read_text()
    for lib in ['sha256', 'poseidon']:
        local = os.path.relpath(root / 'tools' / lib, manifest.parent)
        source = re.sub(r'^' + lib + r'\s*=\s*\{[^\n]*git\s*=\s*"https://github.com/noir-lang/' + lib + r'"[^\n]*\}', lib + ' = { path = "' + local + '" }', source, flags=re.M)
    manifest.write_text(source)
