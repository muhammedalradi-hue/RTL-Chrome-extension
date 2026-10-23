#!/usr/bin/env bash
# يبني حزمة Zip جاهزة للرفع على Chrome Web Store: ملفات الإضافة فقط،
# دون المستودع والوثائق ونصوص المتجر.
set -euo pipefail
cd "$(dirname "$0")/.."
VERSION=$(python3 -c "import json;print(json.load(open('manifest.json'))['version'])")
OUT="release/mango-tools-${VERSION}.zip"
mkdir -p release
rm -f "$OUT"
zip -q -X -r "$OUT" manifest.json background.js content.js content.css dictate.js offscreen.html offscreen.js recorder-worklet.js options.html options.css options.js icons \
  -x '*.DS_Store' '*/.*'
echo "$OUT"
unzip -l "$OUT"
