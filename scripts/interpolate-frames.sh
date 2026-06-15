#!/bin/bash
# Smooth assembly frames: 63 JPEG → ~123 via ffmpeg minterpolate → WebP q80
# Spec: docs/superpowers/specs/2026-06-12-assembly-scroll-smooth-design.md
set -euo pipefail
cd "$(dirname "$0")/.."

SRC="public/frames"
OUT="public/frames-smooth"
TYPES=(concrete villa tropical factory largeroof field parking)

manifest="{"
for type in "${TYPES[@]}"; do
  # Skip types that don't have source frames yet (new types added incrementally).
  if [ ! -f "$SRC/$type/001.jpg" ]; then
    echo "── $type: no source frames at $SRC/$type — skipping"
    if [ -d "$OUT/$type" ]; then
      count=$(ls "$OUT/$type" | grep -c '.webp' || true)
      [ "$count" -gt 0 ] && manifest="$manifest\"$type\":$count,"
    fi
    continue
  fi
  tmp=$(mktemp -d)
  echo "── $type: interpolating…"
  nice -n 15 ffmpeg -y -loglevel error -framerate 25 -i "$SRC/$type/%03d.jpg" \
    -vf "minterpolate=fps=50:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1:scd=fdiff:scd_threshold=4" \
    -q:v 2 "$tmp/%03d.jpg"
  mkdir -p "$OUT/$type"
  echo "── $type: webp…"
  for f in "$tmp"/*.jpg; do
    n=$(basename "$f" .jpg)
    nice -n 15 cwebp -quiet -q 80 "$f" -o "$OUT/$type/$n.webp"
  done
  count=$(ls "$OUT/$type" | grep -c '.webp')
  manifest="$manifest\"$type\":$count,"
  rm -rf "$tmp"
  echo "── $type: $count frames ($(du -sh "$OUT/$type" | cut -f1))"
done
echo "${manifest%,}}" | sed 's/{/{"ext":"webp",/' > "$OUT/manifest.json"
cat "$OUT/manifest.json"
echo "DONE"
