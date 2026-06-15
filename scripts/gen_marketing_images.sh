#!/bin/bash
# Generate in-context Panama marketing photos (Hero + 6 project cards) via Nano Banana Pro.
# Network-bound (low local CPU). Output: public/images/ (jpg).
set -uo pipefail
cd "$(dirname "$0")/.."
GEN="/Users/kanieltordjman/Desktop/projects/.claude/skills/nano-banana-pro/scripts/generate_image.py"
IMG="public/images"; PROJ="$IMG/projects"
mkdir -p "$PROJ"
TMP=$(mktemp -d)
STYLE="Professional aerial drone real-estate photography, photorealistic, Panama tropical setting, bright natural daylight, wide 16:9 composition, clean modern solar panels clearly visible, no people, no cars, no text, no watermark, no logos, no cartoon."

gen() { # out resolution targetjpg W H prompt
  local out="$1" res="$2" jpg="$3" w="$4" h="$5" prompt="$6"
  echo ">> $jpg"
  uv run "$GEN" --prompt "$prompt $STYLE" --filename "$TMP/$out.png" --resolution "$res" >/dev/null 2>&1
  if [ -f "$TMP/$out.png" ]; then
    sips -s format jpeg -z "$h" "$w" "$TMP/$out.png" --out "$jpg" >/dev/null 2>&1
    echo "   ok $(du -h "$jpg" 2>/dev/null | cut -f1)"
  else echo "   FAILED"; fi
}

gen hero 2K "$IMG/hero-panama-solar.jpg" 1920 1080 "Cinematic aerial drone photo of a premium modern Panamanian home with a clean rooftop black-blue solar panel array, lush tropical surroundings and palm trees, soft golden-hour light, sky visible."
gen p1 1K "$PROJ/01-casa.jpg"       960 540 "3/4 aerial photo of a single-story Panamanian concrete stucco home with a flat roof covered by a neat array of black-blue solar panels, tropical garden, suburban Pedasi Los Santos Panama."
gen p2 1K "$PROJ/02-hotel.jpg"      960 540 "Aerial photo of a charming boutique hotel building in Las Tablas Panama with black-blue solar panels covering its roof, tropical landscaping and a pool."
gen p3 1K "$PROJ/03-finca.jpg"      960 540 "Aerial photo of an agricultural farm in Chitre Herrera Panama with a ground-mount solar panel array beside green fields and a barn building."
gen p4 1K "$PROJ/04-residencia.jpg" 960 540 "Aerial photo of a modern upscale residence in Costa del Este Panama City with rooftop solar panels and contemporary architecture."
gen p5 1K "$PROJ/05-bodega.jpg"     960 540 "Aerial photo of a large industrial warehouse and distribution center in Panama City with a vast flat rooftop covered in long rows of solar panels."
gen p6 1K "$PROJ/06-villa.jpg"      960 540 "Aerial photo of a beachfront villa near Playa Venao Panama with rooftop black-blue solar panels and a battery cabinet, ocean and palm trees nearby, golden light."
rm -rf "$TMP"
echo "=== DONE ==="; ls -la "$IMG"/*.jpg "$PROJ"/*.jpg 2>/dev/null
