// The promo, horizontal (16:9) or vertical (9:16: TikTok, Reels, Stories). Every cut, card and the closing come from
// timeline.json (written by plan.mjs from the song's beats); this file is only how they look, per format (FMT).
// Clips: public/clips/<name>.mp4 and public/clips-v/ (capture.mjs, each format captured for itself), music: public/music-edit.wav
// (music.py), logo: public/logo-anim/*.png (logo.mjs: the game's own title logo, animated by the game on the promo's beat).
import { loadFont } from '@remotion/fonts';
import { Audio, Video } from '@remotion/media';
import { AbsoluteFill, Easing, Img, interpolate, Sequence, staticFile, useCurrentFrame } from 'remotion';
import tl from './timeline.json';
import logoAnim from '../public/logo-anim.json';

const CREAM = '#fff3d6', GOLD = '#f5c518', DARK = '#2a1a10'; // the game's palette (src/hud/sprites.js)
const FONT = 'Baloo'; // (not «Baloo 2» unquoted: a CSS family name can't have a bare number, it falls back to serif)
loadFont({ family: FONT, url: staticFile('fonts/baloo-2-latin.woff2'), weight: '800' });
loadFont({ family: FONT, url: staticFile('fonts/baloo-2-latin-ext.woff2'), weight: '800', unicodeRange: 'U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+1E00-1EFF' });

// Per format. v: text and logo inside the platforms' safe zone (their tabs on top, caption and buttons at the bottom and
// right): cards on two balanced lines a little above the middle, the closing block in the upper-middle.
export const FMT = {
  h: { clips: 'clips', card: { size: 150, width: 1640, lift: 0 }, logoW: 1060, closeTop: 150, line: 84, url: 64 },
  v: { clips: 'clips-v', card: { size: 132, width: 860, lift: 200 }, logoW: 900, closeTop: 540, line: 74, url: 62 },
};
type Fmt = (typeof FMT)['h'];
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const out = Easing.bezier(0.16, 1, 0.3, 1);

type Shot = (typeof tl.shots)[number];

// One shot: its fades (to and from black) and, in the opening, a darker vignetted grade that lifts into the tune.
const Clip = ({ s, fmt }: { s: Shot; fmt: Fmt }) => {
  const f = useCurrentFrame();
  const opacity = Math.min(s.fadeIn ? interpolate(f, [0, s.fadeIn], [0, 1], { ...clamp, easing: Easing.inOut(Easing.quad) }) : 1,
    s.fadeOut ? interpolate(f, [s.dur - s.fadeOut, s.dur], [1, 0], { ...clamp, easing: Easing.in(Easing.quad) }) : 1);
  const dusk = s.grade === 'dusk' ? interpolate(f, [0, s.dur], [0.62, 0.8], clamp) : s.grade === 'dusk-open' ? interpolate(f, [0, s.dur], [0.8, 1], { ...clamp, easing: Easing.in(Easing.quad) }) : 1;
  const vignette = s.grade === 'dusk' ? 0.8 : s.grade === 'dusk-open' ? interpolate(f, [0, s.dur], [0.8, 0], clamp) : 0;
  return (
    <AbsoluteFill style={{ opacity }}>
      <Video src={staticFile(`${fmt.clips}/${s.name}.mp4`)} volume={0} style={{ width: '100%', height: '100%', filter: dusk < 1 ? `brightness(${dusk}) saturate(${0.75 + 0.25 * dusk})` : undefined }} />
      {vignette > 0 && <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 35%, rgba(0,0,0,${vignette}) 100%)` }} />}
    </AbsoluteFill>
  );
};

// A card on black: big, few words, in for a short ease and out with a quick fade. Horizontal: one line, smaller when long
// so it stays inside the safe area (Baloo's letters average about half an em); vertical: wraps into balanced lines.
const Card = ({ text, gold, dur, fmt }: { text: string; gold: number; dur: number; fmt: Fmt }) => {
  const f = useCurrentFrame();
  const words = text.split(' ');
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', paddingBottom: fmt.card.lift }}>
      <div style={{
        fontFamily: FONT, fontWeight: 800, fontSize: fmt === FMT.h ? Math.min(fmt.card.size, Math.floor(fmt.card.width / (0.52 * text.length))) : fmt.card.size,
        maxWidth: fmt.card.width, textAlign: 'center', textWrap: 'balance', lineHeight: 1.08, color: CREAM, letterSpacing: '-0.01em',
        opacity: interpolate(f, [0, 10, dur - 8, dur], [0, 1, 1, 0], clamp),
        scale: interpolate(f, [0, 24], [1.08, 1], { ...clamp, easing: out }),
      }}>
        {/* the last words in gold: the ones to remember. Each word is unbreakable: lines wrap only at spaces (never «Segueix-/li») */}
        {words.map((w, i) => <span key={i}><span style={{ whiteSpace: 'nowrap', color: i >= words.length - gold ? GOLD : undefined }}>{w}</span>{i < words.length - 1 ? ' ' : ''}</span>)}
      </div>
    </AbsoluteFill>
  );
};

// The closing, from the final roll: the plaça darkens and the logo lands, the line follows, and the address pops on
// the last hit. Then the plaça fades to black with the music; the logo, the line and the address stay.
const Close = ({ fmt }: { fmt: Fmt }) => {
  const f = useCurrentFrame();
  const inAt = (at: number, len = 14) => interpolate(f, [at, at + len], [0, 1], { ...clamp, easing: out });
  const k = fmt.logoW / logoAnim.logoW; // the logo's frames include room for its hops: scale so its letters are logoW wide
  const hit = tl.close.hit, fadeFrom = tl.frames - tl.close.from - Math.round(0.8 * tl.fps);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: 'rgba(20,10,5,0.62)', opacity: inAt(0, 8) }} />
      {/* the plaça goes to black with the music's last fade; the logo, the line and the address stay */}
      <AbsoluteFill style={{ background: '#000', opacity: interpolate(f, [fadeFrom, fadeFrom + Math.round(0.8 * tl.fps)], [0, 1], { ...clamp, easing: Easing.in(Easing.quad) }) }} />
      <AbsoluteFill style={{ alignItems: 'center', paddingTop: fmt.closeTop }}>
        {/* the game's logo frame by frame (its bounce, glint and TAP TAP DANCE hops), keeping the static logo's layout box */}
        <Img src={staticFile(`logo-anim/${String(Math.min(f, logoAnim.frames - 1)).padStart(4, '0')}.png`)}
          style={{ width: logoAnim.w * k, marginTop: -logoAnim.logoY * k, marginBottom: -(logoAnim.h - logoAnim.logoY - logoAnim.logoH) * k, opacity: inAt(0, 4), scale: interpolate(f, [0, 16], [1.35, 1], { ...clamp, easing: Easing.out(Easing.back(1.6)) }) }} />
        <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: fmt.line, color: CREAM, marginTop: 30, opacity: inAt(36), translate: `0 ${(1 - inAt(36)) * 24}px` }}>
          {tl.close.line}
        </div>
        <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: fmt.url, color: DARK, background: GOLD, borderRadius: 999, padding: '4px 48px 0', marginTop: 34,
          opacity: inAt(hit, 4), scale: interpolate(f, [hit, hit + 14], [1.3, 1], { ...clamp, easing: Easing.out(Easing.back(2.2)) }) }}>
          {tl.close.url}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const Promo = ({ format }: { format: 'h' | 'v' }) => { const fmt = FMT[format]; return (
  <AbsoluteFill style={{ background: '#000' }}>
    {tl.shots.map(s => (
      <Sequence key={s.name} name={s.name} from={s.from} durationInFrames={s.dur} premountFor={30}>
        <Clip s={s} fmt={fmt} />
      </Sequence>
    ))}
    {tl.cards.map(c => (
      <Sequence key={c.text} name={`card: ${c.text}`} from={c.from} durationInFrames={c.dur}>
        <Card text={c.text} gold={c.gold} dur={c.dur} fmt={fmt} />
      </Sequence>
    ))}
    <Sequence name="closing" from={tl.close.from}>
      <Close fmt={fmt} />
    </Sequence>
    <Audio src={staticFile('music-edit.wav')} />
  </AbsoluteFill>
); };
