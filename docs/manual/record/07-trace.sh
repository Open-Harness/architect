# Section trace (chapter 7). Sourced by ../capture.sh. It starts the app with start_app and stops it with stop.
# ---- Run it, break it, read the trace --------------------------------------------------------------------------------
start_app
sign_in aaron
cli claim-first.txt handle claim --name firstpage
cli claim-second.txt handle claim --name secondpage
# The same refused call over HTTP, to read the trace's id from the answer's headers.
{ echo "\$ curl -i -X POST $url/handle/claim -H 'authorization: Bearer <token>' -H 'content-type: application/json' -d '{\"name\":\"secondpage\"}'"; post handle/claim '{"name":"secondpage"}'; } > "$out/refusal-http.txt"
refused="$(sed -n 's/^x-trace-id: //p' "$out/refusal-http.txt")"
# A call that is answered, to read beside the refused one: the public page.
{ echo "\$ curl -i -X POST $url/profile/get -H 'content-type: application/json' -d '{\"handle\":\"firstpage\"}'"
  curl -si -X POST "$url/profile/get" -H content-type:application/json -d '{"handle":"firstpage"}' | tr -d '\r'; echo; } > "$out/answer-http.txt"
answered="$(sed -n 's/^x-trace-id: //p' "$out/answer-http.txt")"
sleep 4 # the Collector writes its files a moment after the call
ortho trace-refused.txt telemetry trace "$refused"
ortho trace-answered.txt telemetry trace "$answered"
stop
forget_token
