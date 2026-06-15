#!/bin/bash
# Generate in-context Panama Service-card photos via Nano Banana Pro. Network-bound.
# Output: public/images/services/*.jpg
set -uo pipefail
cd "$(dirname "$0")/.."
GEN="/Users/kanieltordjman/Desktop/projects/.claude/skills/nano-banana-pro/scripts/generate_image.py"
SVC="public/images/services"; mkdir -p "$SVC"
TMP=$(mktemp -d)
STYLE="Professional photorealistic photography, Panama tropical setting, bright natural daylight, wide 16:9 composition, clean modern black-blue solar panels, no people, no cars, no text, no watermark, no logos, no cartoon."

gen() { local out="$1" jpg="$2" prompt="$3"
  echo ">> $jpg"
  uv run "$GEN" --prompt "$prompt $STYLE" --filename "$TMP/$out.png" --resolution 1K >/dev/null 2>&1
  if [ -f "$TMP/$out.png" ]; then
    sips -s format jpeg -z 540 960 "$TMP/$out.png" --out "$jpg" >/dev/null 2>&1; echo "   ok"
  else echo "   FAILED"; fi
}

gen s1 "$SVC/01-residential.jpg" "Aerial 3/4 photo of a Panamanian residential home with a clean rooftop solar panel array, tropical suburban neighborhood with palm trees and gardens."
gen s2 "$SVC/02-commercial.jpg"  "Aerial photo of a modern commercial business building / office in Panama City with solar panels covering the roof, urban tropical setting."
gen s3 "$SVC/03-solarfarm.jpg"   "Aerial photo of a utility-scale ground-mount solar farm in Panama, long parallel rows of tilted solar panels across green tropical land, perimeter fence."
gen s4 "$SVC/04-battery.jpg"     "Clean photo of a modern home energy battery storage system, sleek wall-mounted lithium battery units and an inverter in a tidy garage utility space, solar visible through a window."
rm -rf "$TMP"; echo "=== DONE ==="; ls -la "$SVC"/*.jpg 2>/dev/null
