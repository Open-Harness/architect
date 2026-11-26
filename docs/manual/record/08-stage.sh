# Section stage (chapter 8). Sourced by ../capture.sh. It needs a clean working tree in the whole repository, because `ortho build`
# refuses any other, and it starts a local staging environment on $port and stops it with `ortho env down`.
# ---- Stage it --------------------------------------------------------------------------------------------------------
# No step here reaches a cloud account. The two that would are run with the account's variables taken away, so that a machine
# that has them still records the refusal and makes nothing. A real deployment is not recorded yet.
run=demo1
ortho stage-secrets.txt secrets --env staging
ortho stage-plan.txt env up staging --plan --run "$run"
ortho stage-destroy-plan.txt env destroy staging --plan --run "$run"
ortho stage-bad-run.txt env up staging --plan --run Demo-1
# The bundle, built once from the commit, and the same file run on this machine as a long-lived local staging.
ortho stage-build.txt build
ortho stage-local-up.txt env up staging --port "$port"
{ echo "\$ curl -i $url/_ortho/bundle"; curl -si "$url/_ortho/bundle" | tr -d '\r' || true; echo; } > "$out/stage-bundle-http.txt"
ortho stage-local-status.txt env status staging
ortho stage-local-down.txt env down staging
rm -rf "$app/.ortho/environments/staging"
# One line not yet committed, and build refuses.
echo "// a line that is not committed" >> "$app/src/handle/claim.ts"
ortho stage-build-dirty.txt build
restore
# What the cloud steps say on a machine with no account, and what proving and promoting say before there is anything to judge.
rec stage-up-no-account.txt "ortho env up staging --run $run" -- env -u CLOUDFLARE_API_TOKEN -u CLOUDFLARE_ACCOUNT_ID node "$repo/packages/cli/src/main.ts" env up staging --run "$run"
rec stage-destroy-no-account.txt "ortho env destroy staging --run $run" -- env -u CLOUDFLARE_API_TOKEN -u CLOUDFLARE_ACCOUNT_ID node "$repo/packages/cli/src/main.ts" env destroy staging --run "$run"
rec stage-prove-no-address.txt "ortho prove --env staging --run $run" -- env -u ORTHO_STAGING_SUBDOMAIN -u ORTHO_STAGING_ORIGIN node "$repo/packages/cli/src/main.ts" prove --env staging --run "$run"
rec stage-promote.txt "ortho promote --to staging" -- env -u ORTHO_LOGBOOK_URL node "$repo/packages/cli/src/main.ts" promote --to staging
rec stage-logbook.txt "ortho env up logbook" -- env -u ORTHO_OIDC_ISSUER -u ORTHO_OIDC_REPOSITORY -u ORTHO_OIDC_REF -u ORTHO_OIDC_WORKFLOW node "$repo/packages/cli/src/main.ts" env up logbook
ortho stage-promote-help.txt promote --help
