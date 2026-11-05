// The horizontal test cut (1280x720, 30 fps): one continuous stretch of the song (beats 132 -> 156), cuts on its beats.
// Every boundary is a whole frame (round(song time * fps)); the shots were captured from those same frames (shots.json
// `nudge`), so the picture sits on the music within a millisecond. Usage: node test/edit.mjs
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url)), OUT = resolve(HERE, 'out'), CL = resolve(OUT, 'clips');
const song = JSON.parse(readFileSync(resolve(HERE, '../../src/song.json'), 'utf8')), B = song.beats, FPS = 30;
const S0 = B[132];
const at = b => Math.round(((B[Math.floor(b)] + (b % 1) * 60 / song.bpm) - S0) * FPS); // frame of a (fractional) beat
const fade1 = at(137.5), end1 = at(138.5), card = at(139), cut2 = at(144), cut3 = at(148), end = at(156), tail = 15;
const total = end + tail, sec = n => (n / FPS).toFixed(6);
const g = [
  `[0:v]trim=end_frame=${end1},setpts=N/${FPS}/TB,fade=t=out:start_frame=${fade1}:nb_frames=${end1 - fade1}[s1]`,
  `color=black:s=1280x720:r=${FPS},trim=end_frame=${cut2 - end1},setpts=N/${FPS}/TB[gap]`,
  `[3:v]format=rgba,trim=end_frame=${cut2 - end1},setpts=N/${FPS}/TB,fade=t=in:start_frame=${card - end1}:nb_frames=6:alpha=1[txt]`,
  `[gap][txt]overlay=format=auto[s1b]`,
  `[1:v]trim=end_frame=${cut3 - cut2},setpts=N/${FPS}/TB[s2]`,
  `[2:v]trim=end_frame=${end - cut3},setpts=N/${FPS}/TB,fade=t=out:start_frame=${end - cut3 - 4}:nb_frames=4[s3]`,
  `color=black:s=1280x720:r=${FPS},trim=end_frame=${tail},setpts=N/${FPS}/TB[s4]`,
  `[s1][s1b][s2][s3][s4]concat=n=5:v=1:a=0,format=yuv420p[v]`,
  // the song itself, untouched but for a 10 ms fade in (no click) and a fade out over the last half second
  `[4:a]atrim=start=${S0}:duration=${sec(total)},asetpts=N/SR/TB,afade=t=in:d=0.01,afade=t=out:st=${sec(end)}:d=${sec(tail)}[a]`,
];
const out = resolve(OUT, 'mulassa-prova-16x9.mp4');
execFileSync('ffmpeg', ['-y', '-v', 'error',
  '-i', resolve(CL, 's1-cap.mp4'), '-i', resolve(CL, 's2-mig.mp4'), '-i', resolve(CL, 's3-obert.mp4'),
  '-loop', '1', '-framerate', String(FPS), '-i', resolve(OUT, 'card-ja-arriba.png'),
  '-i', resolve(HERE, '../../public/music/mulassa-taiko.wav'),
  '-filter_complex', g.join(';'), '-map', '[v]', '-map', '[a]',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-profile:v', 'high', '-r', String(FPS),
  '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-movflags', '+faststart', '-t', sec(total), out], { stdio: 'inherit' });
console.log(out, { frames: total, cuts: { fade1, end1, card, cut2, cut3, end } });
