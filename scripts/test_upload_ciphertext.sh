#!/usr/bin/env bash
set -euo pipefail

BACKEND_URL=${BACKEND_URL:-http://localhost:8787}

tmpdir=$(mktemp -d)
cleanup(){ rm -rf "$tmpdir"; }
trap cleanup EXIT

echo "[1/4] Create fake ciphertext and metadata"
head -c 2048 </dev/urandom >"$tmpdir/ct.enc"
cat >"$tmpdir/meta.json" <<'JSON'
{
  "v": 1,
  "alg": "AES-GCM",
  "chunkSize": 65536,
  "ivBase": "counter-last4",
  "wrap": { "alg": "RSA-OAEP", "wrappedKey": "dGVzdA" },
  "originalName": "sample.bin",
  "originalType": "application/octet-stream"
}
JSON

echo "[2/4] Upload ciphertext + metadata"
resp=$(curl -sS -X POST "$BACKEND_URL/upload-ciphertext" -F "file=@$tmpdir/ct.enc" -F "metadata=$(cat "$tmpdir/meta.json")")
echo "$resp"
cipher=$(node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{let j=JSON.parse(s);console.log(j.ciphertextHash||"")}catch(e){process.exit(1)}})') <<<"$resp"
meta=$(node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{let j=JSON.parse(s);console.log(j.metadataHash||"")}catch(e){process.exit(1)}})') <<<"$resp"
test -n "$cipher" && test -n "$meta"

echo "[3/4] Negative: missing metadata"
set +e
code=$(curl -sS -o /dev/null -w "%{http_code}" -X POST "$BACKEND_URL/upload-ciphertext" -F "file=@$tmpdir/ct.enc")
set -e
if [ "$code" -lt 400 ]; then echo "Expected 4xx" >&2; exit 2; fi

echo "[4/4] OK"


