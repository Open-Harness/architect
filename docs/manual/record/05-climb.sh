# Section climb (chapter 5). Sourced by ../capture.sh.
# ---- Build until green -----------------------------------------------------------------------------------------------
ortho brief.txt brief handle.claim
# Rung 0: the scaffold `ortho generate` writes when the handler is not there.
mv "$app/src/handle/claim.ts" "$keep/claim.ts"
ortho climb-0-generate.txt generate
copy climb-0-handler.ts.txt src/handle/claim.ts
ortho climb-0-prove.txt prove --only "claim a handle"
# Rung 1: the records are written, and the move is forgotten.
node -e 'const fs=require("node:fs"),[from,to]=process.argv.slice(1),text=fs.readFileSync(from,"utf8"),cut=text.replace(/\n    \/\/ The move claim, to claimed\.\n    yield\* move\(\);\n/,"\n");if(cut===text)throw new Error("the move is not where the recording expects it");fs.writeFileSync(to,cut)' "$keep/claim.ts" "$app/src/handle/claim.ts"
copy climb-1-handler.ts.txt src/handle/claim.ts
ortho climb-1-prove.txt prove --only "claim a handle"
# Rung 2: the handler as it is in the repository.
cp "$keep/claim.ts" "$app/src/handle/claim.ts"
copy climb-2-handler.ts.txt src/handle/claim.ts
ortho climb-2-prove.txt prove --only "claim a handle"
restore
ortho prove.txt prove
ortho check.txt check
