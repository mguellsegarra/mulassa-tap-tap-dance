#!/bin/sh
# The teaser's MP4 from film.mjs's frames and build-audio.py's music: a second of black and silence first (a player eats
# a kick on the very first frame), then the film from its second kick, where its first shot comes in. sh export.sh [fps]
set -e
OUT="$(cd "$(dirname "$0")/../../../../.." && pwd)/output/instagram/bou-teaser"; FPS="${1:-60}"; SKIP=$((FPS / 2))
ffmpeg -y -v error -i "$OUT/musica-a.wav" -f lavfi -t 0.99 -i anullsrc=r=44100:cl=stereo \
  -filter_complex "[0:a]atrim=start=0.49,asetpts=PTS-STARTPTS,afade=t=in:d=0.008[x];[1:a][x]concat=n=2:v=0:a=1[a]" -map "[a]" -c:a pcm_s24le "$OUT/audio.wav"
ffmpeg -y -v error -f lavfi -i "color=c=0x05040a:s=1080x1920:r=$FPS:d=1" -framerate "$FPS" -start_number "$SKIP" -i "$OUT/frames/%05d.jpg" -i "$OUT/audio.wav" \
  -filter_complex "[1:v]scale=in_range=full:out_range=tv:out_color_matrix=bt709,format=yuv420p[m];[0:v]format=yuv420p[b];[b][m]concat=n=2:v=1:a=0[v]" -map "[v]" -map 2:a \
  -c:v libx264 -preset slower -crf 12 -profile:v high -level 4.2 -pix_fmt yuv420p -color_primaries bt709 -color_trc bt709 -colorspace bt709 -color_range tv \
  -c:a aac -b:a 320k -ar 48000 -movflags +faststart "$OUT/bou-teaser.mp4"
echo "$OUT/bou-teaser.mp4"
