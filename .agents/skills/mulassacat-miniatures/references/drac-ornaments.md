# Ornament additions to the approved Drac A (2026-10-19)

The owner asked to add the tail, back/flank and neck motifs visible on the voxel model, then authorized the retouch with "fehso". This authorizes a local detail change, not a new silhouette or publication. The original traced A remains the approved base. The owner separately accepted the ornament result on 2026-10-19: "Sí, dono el retoc per tancat". The ornament derivative is now the approved current selector reference.

## Evidence and adaptation

Inspected the three previously downloaded UAF photos in the task artifact root (`drac-uaf-1.jpg`, `drac-uaf-2.jpg`, `drac-uaf-3.jpg`), and the daylight contact sheets `motion-024.jpg` and `motion-036.jpg` in the Desktop research pack. Extracted a native-resolution frame at36.5s from `pm-lEViiPK0.mp4` using the video-frames skill's ffmpeg wrapper. Source: https://www.youtube.com/watch?v=pm-lEViiPK0 (El Camp Difusio, Ball del Drac de Valls, 2018-06-24). The new frame is `Drac-ornaments/reference-36.5.jpg` under the existing artifact root.

That side view shows oval red motifs on the segmented tail/flank and smaller ones along the neck, with yellow centres/raised details and surrounding light/yellow/blue-green paint. The voxel represents these with square red centres and gold borders. The retouch adapts their placement and oval shape to the already approved illustration's existing gold-rim/red-centre motif; it does not claim to reproduce the real paint pattern exactly. Exact counts, spacing, rim thickness and colour values are artistic simplifications for small cards. The live UAF page timed out and its image URL was unavailable through web browsing during this pass; visual evidence came from the reopened local photos and video, not a successful web fetch.

## Reproduction

Run `python3 scripts/add_drac_ornaments.py assets/drac-valls-A-traced.svg assets/drac-valls-A-ornaments.svg` from this skill directory. It appends one normalized-coordinate group after the untouched original trace. Four semantic subgroups contain four oval motifs each: tail, flank, high-neck, low-neck. The last tail motif was moved inward to leave a visible gap from the existing flank ornament.

The original master stays intact. The new master has495nodes and136841bytes, about2.3KB above the base. No new image generation, raster editing, retracing, embedded bitmap, animation, filters, external dependency or global CSS is involved. The selector module uses the new master with decorative class/aria-hidden instead of the standalone role/label. The underlying card still owns the accessible name.

## Verification

All original contour bytes survive as an exact prefix. Parsed master/inline SVG parity passes. Browser rendering before/after at1600x1120 gives zero changed alpha pixels: additions stay inside the existing silhouette. Painted bounds remain x9.2005625,y4.0000005,width141.598877,height100.000008. The original frame, baseline and64.4% height ratio are untouched.

Artifacts: `~/.t3/artifacts/mulassa-illustration-skill-20261019/Drac-ornaments/`. Chromium fine-pointer captures cover375x667,393x852,852x393,1280x800,1920x1080; baseline difference stays below.014px, captions remain complete. These are viewport checks, not physical-device or Safari tests. See check.log for project validation and validation.json for measurements.

Project `npm run check` completed with exit0. SVG audit, skill-creator quick validation (via uv with PyYAML), original-contour preservation, inline/master parity and music hash comparison passed. Selected Drac and pending Aliga states were checked. Owned preview tab closed; task cleanup removed only its temporary directory and preserved the shared5179 server. No commit or publication.
