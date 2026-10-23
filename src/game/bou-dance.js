// Phrase-based adaptation of the traditional Bou's observed turns, lateral passes and leg extensions.
// Timing comes only from Marc's approved v13, not a constant BPM or the video's clock.
import bouSong from '../song-bou.json' with { type: 'json' };
import { beatAtTime } from '../core/beat-grid.js';
import { sampleTrack, planBouFeet, legGesture } from './bou-feet.js';

// timing.json's landmarks and grid, as tools/build_bou_chart.mjs copies them into the song (the same numbers)
const timing = { duration: bouSong.duration, beats: bouSong.beats, ...bouSong.dance, bars: bouSong.dance.bars.map(([sourceBar, beat, time]) => ({ sourceBar, beat, time })) };
export const BOU_TIMING = timing;
const clamp = x => Math.max(0, Math.min(1, x));
const ease = x => { x=clamp(x); return x*x*x*(10+x*(-15+6*x)); };
const bar = n => timing.bars.find(b=>b.sourceBar===n);
const barBeat = n => bar(n).beat;
const openingBeat = barBeat(1);
const keys = entries => entries.map(([bar,value])=>[bar===0 ? 0 : barBeat(bar),value]);
// Unwrapped angles: every intended turn survives interpolation; the final facing is the entrance facing.
const yaw=keys([[0,0],[1,0],[9,.12],[13,Math.PI],[18,Math.PI*2],[19,Math.PI*2],
  [27,Math.PI*2+.15],[31,Math.PI*3],[35,Math.PI*4],[39,Math.PI*3],[43,Math.PI*2],
  [47,Math.PI*2],[60,Math.PI*2],[64,Math.PI*2],[72,Math.PI*2],
  [76,Math.PI*4],[80,Math.PI*6],[84,Math.PI*8],[88,Math.PI*9],[92,Math.PI*10]]);
const x=keys([[0,0],[1,0],[9,-.35],[13,.35],[18,0],[19,0],[23,-1.05],[27,.9],
  [31,.45],[35,-.5],[39,.55],[43,-.75],[47,.65],[60,.35],[64,0],[68,-.2],[72,0],
  [76,.6],[80,-.6],[84,.4],[88,-.35],[92,0]]);
const z=keys([[0,0],[1,0],[9,.1],[13,-.25],[18,0],[19,.1],[23,.35],[27,-.2],
  [31,.35],[35,-.4],[39,.3],[43,0],[47,-.25],[60,.3],[64,0],[68,0],[72,0],
  [76,.35],[80,-.35],[84,.2],[88,0],[92,0]]);
export const BOU_PHASES = [
  [0,'Entrada'],[timing.melodyStart,'Primeres passes'],[bar(9).time,'Canvis de cara'],[bar(19).time,'Passada lateral'],
  [timing.technoStart,'Voltes'],[bar(64).time,'Arrencada'],
  [bar(72).time,'Voltes de festa'],[timing.finaleCandidate,'Final'],
];
export function newBouPose() { return {x:0,z:0,yaw:0,pitch:0,roll:0,lift:0,beat:0}; }
export function bouPose(t,out=newBouPose()) {
  t=Math.max(0,Math.min(t,timing.duration));
  // Exact subdivision grid also preserves the within-beat ritardando at source bar 63.
  const beat=beatAtTime(timing.subdivisionTimes,t)/timing.subdivision;
  const active=ease((beat-openingBeat)/4)*(1-ease((beat-barBeat(92))/4));
  const energy=.4+.6*ease((beat-barBeat(64))/(barBeat(84)-barBeat(64)));
  out.x=sampleTrack(x,beat);out.z=sampleTrack(z,beat);out.yaw=sampleTrack(yaw,beat);
  out.pitch=active*(.035*Math.sin((beat-openingBeat)*Math.PI/4)+.018*energy*Math.sin((beat-openingBeat)*Math.PI));
  out.roll=active*.025*Math.sin((beat-openingBeat)*Math.PI/2);
  // Small carrier-driven lift only. The reference's collective overhead lift needs exterior carriers.
  out.lift=active*(.012+.018*energy)*(1-Math.cos((beat-openingBeat)*Math.PI))/2;
  out.beat=beat;return out;
}
export function createBouDance() {
  const gesture=legGesture(timing.beats,timing.melodyStart);
  const feet=planBouFeet(bouPose,0,timing.duration,(t,i)=>t<bar(9).time ? gesture(t,i) : 0);
  return {pose:bouPose,foot:feet};
}
