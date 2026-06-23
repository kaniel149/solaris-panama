#!/usr/bin/env python3
"""
Generate Panama-specific solar assembly-scroll source frames (001-063.jpg, 960x540)
for the SolarInstallationScroll component, using Nano Banana Pro (Gemini 3 Pro Image)
image-to-image from the approved Panama reference renders.

Recipe (from original-assembly-frames-generation-guide.md):
  6 beats: 001-008 bare | 009-017 wiring/civil | 018-028 mounting | 029-039 panels
           | 040-049 complete | 050-063 orbit.
Strategy: generate ~16 KEYFRAMES per type via an image-to-image chain (each keyframe
edits the previous one, so camera/lighting/subject stay locked), then FORWARD-FILL to
63 frames. ffmpeg minterpolate (interpolate-frames.sh) later smooths 63 -> 123 webp.

Usage:
  python3 scripts/gen_panama_assembly.py <type>[,<type>...]   # or: all
Resumable: existing keyframe PNGs are skipped.
"""
import os, sys, subprocess, shutil
from pathlib import Path

GEN = "/Users/kanieltordjman/Desktop/projects/.claude/skills/nano-banana-pro/scripts/generate_image.py"
REFDIR = Path("/Users/kanieltordjman/Desktop/projects/solar/bustan/bustan-energy/handoff/assembly-panama-reference/assets")
REPO = Path("/Users/kanieltordjman/Desktop/projects/solar/panama/solaris-panama-repo")
FRAMES = REPO / "public" / "frames"

STYLE = ("Clean near-white seamless studio background, soft tropical Panama daylight, "
         "photorealistic architectural visualization, centered 3/4 aerial isometric-leaning "
         "16:9 wide view, Tier-1 mono black-blue solar panels, silver aluminum rails, subject "
         "fills ~70% of frame. No people, no vehicles, no text, no logos, no watermarks, no "
         "cartoon, no CAD diagram, no dark background. "
         "CRISP PHOTOREALISTIC PHOTOGRAPHY with neutral white balance and a consistent clean "
         "near-white studio background. Do NOT stylize, do NOT apply a painterly / illustrated / "
         "sketch look, and do NOT shift the colors warm or pink — keep it sharp and photoreal.")

TYPES = {
    "concrete": dict(ref="01-panama-concrete-house-reference.png", kind="roof",
        subj="A single Panama residential concrete/stucco home with a flat reinforced-concrete roof, parapet, rain gutters, small covered terrace and compact tropical garden edges"),
    "villa": dict(ref="02-panama-villa-reference.png", kind="roof",
        subj="A Panama luxury villa with white stucco walls, terracotta clay-tile roof sections, deep overhangs, shaded veranda and controlled tropical landscaping"),
    "tropical": dict(ref="03-panama-tropical-lodge-reference.png", kind="roof",
        subj="A Panama tropical timber eco-lodge with warm hardwood structure, broad pitched roof, deep covered deck, raised foundation and lush rainforest planting"),
    "factory": dict(ref="04-panama-factory-reference.png", kind="roof",
        subj="A Panama light-industrial factory building with light-grey concrete/metal facade, roller loading-bay doors, rooftop HVAC units/vents and a flat metal roof"),
    "largeroof": dict(ref="05-panama-large-roof-reference.png", kind="roof",
        subj="A huge Panama logistics / distribution-center building, very wide low rectangular footprint, pale facade and a vast uninterrupted flat roof with a clean parapet"),
    "field": dict(ref="06-panama-solar-field-reference.png", kind="field",
        subj="A cleared green tropical Panama land plot for a ground-mount solar farm, wet-tropical grass, gravel service area and a simple perimeter fence"),
    "parking": dict(ref="07-panama-parking-canopy-reference.png", kind="parking",
        subj="A Panama commercial parking area with marked bays, white parking lines, wheel stops, concrete/asphalt pavement and a tropical planting border"),
}

# Per-kind stage language for each beat.
def stage_prompt(kind, beat):
    if kind == "field":
        return {
            "bare":   "Bare cleared land plot only. NO solar, NO racking, NO panels yet.",
            "civil":  "Now ground screws and concrete footings are being set in aligned rows across the plot. Still NO racking tables and NO panels.",
            "mount":  "Now galvanized steel ground-mount racking tables (tilted, empty) stand in long perfectly-aligned parallel rows. Still NO panels on them yet.",
            "panels_a":"Now the first parallel rows of tilted mono black-blue solar panels are mounted on the front tables; the rear tables are still empty.",
            "panels_b":"Now about half of the racking tables are filled with tilted mono black-blue solar panels in clean aligned rows.",
            "panels_c":"Now most of the racking tables are filled with tilted mono black-blue solar panels.",
            "done":   "Complete ground-mount solar farm: every aligned row filled with tilted mono black-blue panels, plus a compact central inverter and transformer skid and clean cable routing.",
        }[beat]
    if kind == "parking":
        return {
            "bare":   "Bare empty parking lot only with marked bays. NO canopy, NO posts, NO panels yet.",
            "civil":  "Now concrete foundations and base plates for the canopy steel columns are being set along the parking rows. Still NO posts standing and NO canopy.",
            "mount":  "Now galvanized steel columns stand in rows with an empty steel canopy frame mounted overhead above the parking bays. Still NO solar panels on the canopy.",
            "panels_a":"Now the first section of the canopy roof is covered with mono black-blue solar panels; the rest of the canopy frame is still bare.",
            "panels_b":"Now about half of the canopy roof is covered with mono black-blue solar panels.",
            "panels_c":"Now most of the canopy roof is covered with mono black-blue solar panels.",
            "done":   "Complete solar carport: the full canopy roof neatly covered with mono black-blue solar panels over the marked parking bays, plus a small electrical cabinet.",
        }[beat]
    # roof
    return {
        "bare":   "Bare roof, NO solar panels and NO mounting rails of any kind.",
        "civil":  "Now electrical conduit and cable trays have been added along the roof (rough-in). Still NO mounting rails and NO solar panels.",
        "mount":  "Now neat rows of silver aluminum mounting rails / racking are installed on the roof. Still NO solar panels on the rails yet.",
        "panels_a":"Now only the FRONT rows of the roof racking are covered with mono black-blue solar panels; the remaining rails are still empty.",
        "panels_b":"Now the FRONT and MIDDLE sections of the roof are covered with mono black-blue solar panels; the rear rails are still empty.",
        "panels_c":"Now ALMOST the entire roof is covered with mono black-blue solar panels; only a small rear strip of rails remains empty.",
        "done":   "Now the ENTIRE roof is neatly and fully covered with mono black-blue solar panels: complete, clean installation.",
    }[beat]

# keyframe plan: (frame_index, beat_key, anchor_index_or_REF)
# Anchors are depth-capped (<=4 edits from the pristine source) to prevent
# image-to-image chain drift / stylization. Early beats anchor to the clean bare
# frame (1); panel beats anchor to the single mount frame (17) so rails stay
# consistent while panel coverage grows; orbit anchors to the complete frame (40).
PLAN = [
    (1,  "bare",     "REF"),
    (9,  "civil",    1),
    (13, "civil",    1),
    (17, "mount",    1),
    (18, "mount",    17),
    (23, "mount",    17),
    (28, "panels_a", 17),
    (29, "panels_a", 17),
    (33, "panels_b", 17),
    (36, "panels_c", 17),
    (39, "done",     17),
    (40, "done",     17),
    (50, "orbit20",  40),
    (54, "orbit40",  40),
    (58, "orbit60",  40),
    (63, "orbit80",  40),
]

def build_prompt(meta, beat):
    subj = meta["subj"]
    if beat.startswith("orbit"):
        deg = beat.replace("orbit", "")
        return (f"{subj}, with a COMPLETE finished solar installation. Same exact subject, same "
                f"lighting and same clean background, but the camera is now orbited about {deg} "
                f"degrees around the finished system (3/4 aerial). {STYLE}")
    s = stage_prompt(meta["kind"], beat)
    if beat == "bare":
        return f"{subj}. {s} {STYLE}"
    return (f"The SAME exact {subj} as the input image — keep the identical building/plot, camera "
            f"angle, framing, lighting and background. {s} {STYLE}")

def run_gen(prompt, out_png, input_img=None, tries=2):
    cmd = ["uv", "run", GEN, "--prompt", prompt, "--filename", str(out_png), "--resolution", "1K"]
    if input_img:
        cmd += ["--input-image", str(input_img)]
    for attempt in range(1, tries + 1):
        r = subprocess.run(cmd, capture_output=True, text=True)
        if r.returncode == 0 and Path(out_png).exists():
            return True
        print(f"   ! gen attempt {attempt} failed: {(r.stderr or r.stdout)[-300:]}", flush=True)
    return False

def gen_type(t):
    meta = TYPES[t]
    ref = REFDIR / meta["ref"]
    if not ref.exists():
        print(f"[{t}] reference missing: {ref}"); return False
    outdir = FRAMES / t
    work = outdir / "_work"
    work.mkdir(parents=True, exist_ok=True)
    print(f"\n=== [{t}] generating {len(PLAN)} keyframes ===", flush=True)
    kf = {}
    for idx, beat, anchor in PLAN:
        png = work / f"kf_{idx:03d}.png"
        kf[idx] = png
        if png.exists():
            print(f"[{t}] {idx:03d} ({beat}) exists, skip", flush=True); continue
        inp = ref if anchor == "REF" else kf.get(anchor)
        prompt = build_prompt(meta, beat)
        print(f"[{t}] {idx:03d} ({beat}) <- {anchor}", flush=True)
        if not run_gen(prompt, png, inp):
            print(f"[{t}] FAILED at {idx:03d}; aborting type", flush=True); return False
    # normalize keyframes -> 960x540 jpg at their index, then forward-fill to 63
    gen_idx = sorted(kf.keys())
    for idx in gen_idx:
        jpg = outdir / f"{idx:03d}.jpg"
        subprocess.run(["sips", "-s", "format", "jpeg", "-z", "540", "960",
                        str(kf[idx]), "--out", str(jpg)], capture_output=True)
    for i in range(1, 64):
        src = max(g for g in gen_idx if g <= i)
        if src != i:
            shutil.copyfile(outdir / f"{src:03d}.jpg", outdir / f"{i:03d}.jpg")
    n = len(list(outdir.glob("[0-9][0-9][0-9].jpg")))
    print(f"[{t}] DONE: {n} frames in {outdir}", flush=True)
    return n == 63

if __name__ == "__main__":
    arg = sys.argv[1] if len(sys.argv) > 1 else "concrete"
    types = list(TYPES.keys()) if arg == "all" else arg.split(",")
    ok = []
    for t in types:
        if t not in TYPES:
            print(f"unknown type {t}"); continue
        ok.append((t, gen_type(t)))
    print("\n=== SUMMARY ===")
    for t, r in ok:
        print(f"  {t}: {'OK' if r else 'INCOMPLETE'}")
