#!/bin/bash
set -eu
repo=$(git rev-parse --show-toplevel)
dest=${1:?Supply a fresh evidence directory}
mkdir -p "$dest"
dest=$(cd "$dest" && pwd)
tmp=$(mktemp -d)
server_pid=''
trap 'if [ -n "$server_pid" ]; then kill "$server_pid" 2>/dev/null || true; fi; rm -rf "$tmp"' EXIT
git clone --quiet --no-local "$repo" "$tmp/checkout"
cd "$tmp/checkout"
python3 scripts/rehearsal-fixtures.py "$tmp/inputs"
port=$(python3 -c 'import socket; s=socket.socket(); s.bind(("127.0.0.1",0)); print(s.getsockname()[1])')
export FORGE_OLLAMA_PORT="$port"
export OLLAMA_HOST="127.0.0.1:$port"
for mode in without with; do
  if [ "$mode" = with ]; then
    ollama serve >"$tmp/server.log" 2>&1 &
    server_pid=$!
    for attempt in {1..30}; do
      if curl -fsS "http://$OLLAMA_HOST/api/tags" >"$tmp/tags" 2>/dev/null; then break; fi
      sleep 1
    done
    if ! curl -fsS "http://$OLLAMA_HOST/api/tags" >"$tmp/tags"; then tail -15 "$tmp/server.log"; exit 1; fi
  fi
  for folder in "$tmp"/inputs/*; do
    name=$(basename "$folder")
    result="$dest/$mode-$name"
    mkdir "$result"
    start=$(date +%s)
    code=0
    node cli.mjs forge --brief "$folder/brief.txt" --docs "$folder/docs" --out "$tmp/$mode-$name" >"$result/stdout.log" 2>"$result/stderr.log" || code=$?
    if [ "$code" = 0 ]; then
      cp "$tmp/$mode-$name/FINAL.md" "$result/"
      if [ "$mode" = with ] && { ! grep -q '^Local model:' "$result/stderr.log" || grep -q '^DEGRADED:' "$result/stderr.log"; }; then code=1; fi
    fi
    python3 -c 'import json,sys; print(json.dumps(dict(commit=sys.argv[1],exitCode=int(sys.argv[2]),wallSeconds=int(sys.argv[3]))))' "$(git rev-parse HEAD)" "$code" "$(($(date +%s)-start))" >"$result/receipt.json"
  done
done
python3 -c 'import pathlib,json,sys; r=list(pathlib.Path(sys.argv[1]).glob("*/receipt.json")); sys.exit(int(len(r)!=6 or any(json.loads(p.read_text())["exitCode"] for p in r)))' "$dest"
