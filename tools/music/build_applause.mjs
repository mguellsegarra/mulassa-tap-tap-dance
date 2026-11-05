// The applause (Chip's ovation at a clear and the few hands on section B's beats) as a recorded file, built once here:
// synthesised on the phone at load it was 15% of an iPhone's JavaScript on the splash in Low Power Mode, on the main
// thread (docs/agents/device-profiling.md). The same crowd: 5 s, ~3000 claps from 150 people a channel, each a short
// noise burst with its own colour and decay; seeded, so the file only changes when this script does.
// usage: node tools/music/build_applause.mjs   (writes public/sfx/applause.mp3; needs uv: the MP3 is LAME through lameenc)
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const APPLAUSE = { rate: 44100, seconds: 5, people: 150, seed: 0x9e3779b1 };
// both channels' samples, [left, right]; random: a seeded generator in [0, 1)
export function synthApplause(random, { rate, seconds, people } = APPLAUSE) {
  const len = rate * seconds, ch = [new Float32Array(len), new Float32Array(len)];
  let s = (random() * 2 ** 31) | 1; // the noise's state (xorshift32, never 0)
  for (let p = 0; p < people * 2; p++) {
    const d = ch[p < people ? 0 : 1];
    const clapRate = 3.2 + random() * 2.5, bright = 0.2 + random() * 0.7, amp = 0.04 + random() * 0.08;
    for (let t = random() / clapRate; t < seconds; t += (1 / clapRate) * (0.85 + random() * 0.3)) {
      const start = Math.floor(t * rate), dec = rate * (0.004 + random() * 0.006), k = Math.exp(-1 / dec);
      const n = Math.min(Math.ceil(dec * 5), len - start);
      let lp = 0, e = amp; // e = amp · exp(-i / dec), one multiply a sample
      for (let i = 0; i < n; i++) {
        s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
        lp += bright * (s / 2147483648 - lp); // one-pole colour per clap
        d[start + i] += lp * e; e *= k;
      }
    }
  }
  return ch;
}
export const seeded = seed => () => { // mulberry32
  seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [l, r] = synthApplause(seeded(APPLAUSE.seed)), pcm = new Int16Array(l.length * 2);
  for (let i = 0; i < l.length; i++) { pcm[2 * i] = Math.max(-1, Math.min(1, l[i])) * 32767; pcm[2 * i + 1] = Math.max(-1, Math.min(1, r[i])) * 32767; }
  const dir = mkdtempSync(join(tmpdir(), 'applause-')), raw = join(dir, 'applause.pcm');
  const out = fileURLToPath(new URL('../../public/sfx/applause.mp3', import.meta.url));
  mkdirSync(fileURLToPath(new URL('../../public/sfx/', import.meta.url)), { recursive: true });
  writeFileSync(raw, Buffer.from(pcm.buffer));
  execFileSync('uv', ['run', '--quiet', '--python', '3.11', '--with', 'lameenc', 'python', '-I', '-c',
    `import lameenc,sys
e=lameenc.Encoder();e.set_bit_rate(96);e.set_in_sample_rate(${APPLAUSE.rate});e.set_channels(2);e.set_quality(2)
d=open(sys.argv[1],'rb').read();open(sys.argv[2],'wb').write(e.encode(d)+e.flush())`, raw, out], { stdio: 'inherit' });
  rmSync(dir, { recursive: true });
  console.log(`wrote ${out}`);
}
