// The Bou's dance (Marc's phrase notes, 24/10/2026, over the reference video 2xG98OA1QqI): the essence of each phrase,
// not the video's exact path. Keyed on Marc's approved v13 (song beats from timing.json's exact grid, never a BPM).
// Compass as the review tool's: W = +z (the opening heading), S = +x, E = -z, N = -x; yaw +: W -> S -> E -> N.
// Two layers: the PATH (where it is and faces, smooth, monotone between keys) and the COMIC layer on every beat, as
// the Drac's: the carriers' knees dip on the beat, the shell waddles a side a beat and nods; in some phrases the front
// and the rump rise in turn (see-saw). It never stands still: on a hold it still bounces on the music.
import bouSong from '../song-bou.json' with { type: 'json' };
import { beatAtTime } from '../core/beat-grid.js';
import { sampleTrack, planBouFeet } from './bou-feet.js';

// timing.json's landmarks and grid, as tools/build_bou_chart.mjs copies them into the song (the same numbers)
const timing = { duration: bouSong.duration, beats: bouSong.beats, ...bouSong.dance, bars: bouSong.dance.bars.map(([sourceBar, beat, time]) => ({ sourceBar, beat, time })) };
export const BOU_TIMING = timing;
const clamp = x => Math.max(0, Math.min(1, x));
const ease = x => { x=clamp(x); return x*x*x*(10+x*(-15+6*x)); };
const bar = n => timing.bars.find(b=>b.sourceBar===n);
// a source bar's first beat (+ beats into it); 0 = the added entrance's start
const at = (n, beats = 0) => (n === 0 ? 0 : bar(n).beat) + beats;
const PI = Math.PI;
// The carried lap (m, source bars): round the plaça's centre inside the colla's marks (5.5 m), from its N point
export const LAP = { r: 2.6, from: 75, beats: 28, a0: Math.PI / 2 }; // a0: its S point, where it faces its way already (E)
// The colla's part in the festa, in song beats: they come in from their marks, grip and lift it (`lift` m), lower it
// and walk back (scene/bou-colla.js carries it, scene/bou-parade.js runs the public behind it)
export const BOU_CARRY = { come: at(72), grip: at(73,2), up: at(74,2), lower: at(81,2), down: at(83,2), back: at(85,2), lift: .4,
  lap: [at(LAP.from), at(LAP.from) + LAP.beats] };
// [bar, beats into it, yaw, x, z]: equal neighbours hold, a reversal stops (monotone Hermite, bou-feet.js)
const PATH = [
  [0,0, 0,0,0], [1,0, 0,0,0],
  // 1-4: facing W, the right leg stretched out, then the left (GESTURES); then half a turn round to face E
  [3,0, 0,0,.12], [4,0, PI/2,.15,.08], [5,0, PI,0,.02],
  // 5-8: facing E, the same, head down on the beat; then on round to face W again
  [7,0, PI,0,-.1], [8,0, 1.5*PI,-.15,-.05], [9,0, 2*PI,0,0],
  // 9-12: a whole turn, front and rump rising in turn; 13-16: unwound the other way
  [13,0, 4*PI,0,.05], [18,0, 2*PI,0,0],
  // 18: a short bar, nearly in place, bouncing
  [19,0, 2*PI,.05,.1],
  // 19-22: stylised steps out to W, a leg each side on the beat; turned round there (via N) to face E, steps back
  [20,2, 2*PI,0,1.05], [22,0, PI,-.1,1.05], [23,0, PI,0,.45],
  // 23-26: on to the middle, the other half turn (via S) to W, then bouncing in place for the drop
  [24,0, PI,0,0], [25,2, 0,.08,0], [27,0, 0,0,0],
  // 27-34, the «techno»: facing W, pulsed side-steps on the beat (WARP): out to W and back, to S and back (half the
  // bars each), to N and back, a diagonal and back
  [28,0, 0,0,.9], [29,0, 0,0,0], [30,0, 0,.9,0], [31,0, 0,0,0],
  [32,0, 0,-.9,0], [33,0, 0,0,0], [34,0, 0,-.45,.45], [35,0, 0,0,0],
  // 35-38: forward to W, half a turn (via S) to face E
  [36,2, 0,0,1], [38,0, PI,.2,.95], [39,0, PI,.1,.8],
  // 39-42: facing E, a turn and a quarter the other way (via N) while it comes back to the middle: faces S
  [43,0, -1.5*PI,0,0],
  // 43-45: out to S; it turns back (via E) and heads N; 47: the turn carries on, a side-step, to W
  [44,2, -1.5*PI,1.05,0], [47,0, -.5*PI,.7,-.1], [60,0, 0,.3,.1],
  // 60-63: near W, short steps, the fermata breathing (the beat itself slows)
  [61,2, .25,.15,.2], [63,0, -.2,0,.15], [64,0, 0,0,0],
  // 64-67: very slow, speeding up with the music: a progressive arc out to N, turning to face E
  [65,0, .15,-.05,.3], [66,0, .45*PI,-.4,.55], [68,0, PI,-.85,.15],
  // 68-71: out and back with nearly a whole turn, ending near the middle
  [70,0, 2*PI,-.1,-.7], [72,0, 3*PI,0,0],
  // 72-83, the festa (Marc 24/10/2026): in the middle facing E while the colla comes in and lifts it (BOU_CARRY); carried
  // out sideways to S, then once round the plaça on LAP (S -> E -> N -> W -> S: Marc's N W S E round, facing its way) with
  // part of the public running behind (scene/bou-parade.js); back to the middle, set down
  [73,2, 3*PI,0,0], [75,0, 3*PI,LAP.r,0],
  ...Array.from({ length: 16 }, (_, k) => { const a = LAP.a0 + PI * (k + 1) / 8;
    return [LAP.from + Math.floor(LAP.beats * (k + 1) / 16 / 4), LAP.beats * (k + 1) / 16 % 4, 2*PI + a + PI / 2, LAP.r * Math.sin(a), LAP.r * Math.cos(a)]; }),
  [83,2, 5*PI,0,0],
  // 84-91: the turn unwinds, quieter, back to W; 92: the middle, facing W
  [86,2, 4.5*PI,.25,.1], [88,0, 4.5*PI,.25,.1], [91,0, 4*PI,0,0],
];
// [bar, beats in, leg ('R' right = feet 0 and 2, 'L' left = 1 and 3), beats out]: a leg stretched forward, heel down,
// toe up, both carriers together
const GESTURES = [
  [1,0,'R',3], [2,0,'L',3], [5,0,'R',3], [6,0,'L',3],
  [19,0,'R',1.5], [19,2,'L',1.5], [20,0,'R',1.5], [20,2,'L',1.5], [22,0,'R',1.5], [22,2,'L',1.5],
  [35,0,'R',1.5], [35,2,'L',1.5], [36,0,'R',1.5], [36,2,'L',1.5],
  [61,0,'R',3], [62,0,'L',3],
].map(([n, b, leg, len]) => ({ start: at(n, b), len, side: leg === 'R' ? 0 : 1 }));
// The comic layer per phrase: [bar, beats in, dip (m, knees on the beat), sway (rad a side a beat), nod (rad, front
// down on the dip), see-saw (rad, front up / rump up on alternate beats), warp (0-1: the path moves between beats and
// eases on them)]. Eased from key to key. The dip always covers the see-saw (front hips never rise past the legs' reach).
const DIP = 1.25; // the dips read small at the play camera's distance
const COMIC = [
  [0,0, .03,.02,.01,0,0], [1,0, .05,.03,.02,0,0], [5,0, .05,.03,.04,0,0], [8,3, .05,.025,.02,0,0],
  [9,0, .06,.02,.01,.065,0], [18,-.5, .06,.02,.01,.065,0], [18,0, .055,.04,.02,0,0],
  [19,0, .05,.055,.02,0,0], [23,0, .05,.035,.02,0,0], [26,0, .07,.045,.03,0,0],
  [27,0, .09,.045,.03,0,.85], [34,3, .09,.045,.03,0,.85], [35,0, .05,.05,.02,0,0],
  [39,0, .05,.035,.02,0,0], [60,0, .045,.045,.02,0,0], [64,0, .05,.03,.02,0,0], [68,0, .06,.04,.02,0,0],
  [72,0, .08,.05,.02,.04,0], [84,0, .055,.035,.02,0,0], [88,0, .04,.025,.015,0,0], [92,0, .03,.02,.01,0,0],
].map(([n, b, dip, ...v]) => [at(n, b), DIP * dip, ...v]);
const track = (keys, c) => keys.map(k => [at(k[0], k[1]), k[c]]);
const YAW = track(PATH, 2), X = track(PATH, 3), Z = track(PATH, 4);
const LIFT = [[0,0],[BOU_CARRY.grip,0],[BOU_CARRY.up,BOU_CARRY.lift],[BOU_CARRY.lower,BOU_CARRY.lift],[BOU_CARRY.down,0],[at(92),0]];
const comic = (beat, c) => { // eased, piecewise: no overshoot
  let i = 0; while (i < COMIC.length - 2 && beat > COMIC[i + 1][0]) i++;
  const a = COMIC[i], b = COMIC[i + 1];
  return a[c] + (b[c] - a[c]) * ease((beat - a[0]) / (b[0] - a[0]));
};
export const BOU_PHASES = [
  [0,'Entrada'],[timing.melodyStart,'Primeres passes'],[bar(9).time,'La volta del davant i la cua'],[bar(19).time,'Passes cap al W i tornada'], // i18n-ok: the dev viewer's phase labels
  [timing.technoStart,'El tros techno'],[bar(35).time,'Voltes'],[bar(60).time,'Calderó'],[bar(64).time,'Arrencada'], // i18n-ok: the dev viewer's phase labels
  [bar(72).time,'Voltes de festa'],[bar(88).time,'Final'],
];
// The comic layer's size (Marc, 24/10/2026, from the dev viewer's «Exagera»: 3x the authored amplitudes, the dips'
// DIP included: k/DIP).
export const BOU_COMIC = 3;
const HEM_DROP = .23; // the skirt's hem (43 cm) stays 20 cm up: clear of a stepping shoe (8.5 cm tall, lifted 10)
export function newBouPose() { return {x:0,z:0,yaw:0,pitch:0,roll:0,lift:0,beat:0}; }
const END_BEAT = at(92);
export function bouPose(t,out=newBouPose()) {
  t=Math.max(0,Math.min(t,timing.duration));
  // Exact subdivision grid also preserves the within-beat ritardando at source bar 63.
  const beat=beatAtTime(timing.subdivisionTimes,t)/timing.subdivision;
  // the last chord: the bounce settles over two beats after the final bar's first (the music's own end)
  const live=1-ease((beat-END_BEAT-2)/4);
  const warp=comic(beat,5), path=beat-warp*Math.sin(2*PI*beat)/(2*PI); // speed 0 on each beat, x2 between: pulsed steps
  out.x=sampleTrack(X,path);out.z=sampleTrack(Z,path);out.yaw=sampleTrack(YAW,path);
  // smooth in the beat: a dip shaped ((1 + cos)/2)^2 peaks on it with no kink (the Drac's)
  // held up by the colla, its carriers' bounce fades out: the lift is theirs, not a dip under it
  const carried=Math.min(BOU_CARRY.lift,sampleTrack(LIFT,beat)), c=(1+Math.cos(2*PI*beat))/2, dip=c*c, k=live*BOU_COMIC*(1-carried/BOU_CARRY.lift);
  out.lift=-k/DIP*comic(beat,1)*(.35+.65*dip); // knees always a little bent (the see-saw and the leg stretches need the slack)
  out.roll=k*comic(beat,2)*Math.sin(PI*beat); // one side a beat, through the middle on the dip
  out.pitch=k*(comic(beat,3)*dip-comic(beat,4)*Math.cos(PI*beat)); // + = front down
  // x3 would sweep the hem into the shoes: the dip, see-saw and waddle together never lower the skirt over the feet
  // (43 cm up, within 0.9 m fore and aft of the middle, 0.3 m to a side) past HEM_DROP; scaled as one, so the shape stays.
  const drop=-out.lift+.9*Math.abs(out.pitch)+.3*Math.abs(out.roll), fit=drop>HEM_DROP?HEM_DROP/drop:1;
  out.lift*=fit;out.pitch*=fit;out.roll*=fit;
  out.lift+=carried; // carried by the colla, the carriers stand straight under it (scene/bou-rig.js)
  out.beat=beat;return out;
}
// 0-1: how far leg `index` is stretched at song second t (a quick reach, held, a quick fold)
function gesture(t, index) {
  const beat = beatAtTime(timing.subdivisionTimes, Math.max(0, t)) / timing.subdivision;
  for (const g of GESTURES) if (g.side === index % 2) {
    const s = beat - g.start;
    if (s > 0 && s < g.len) return clamp(Math.min(ease(s / .4), 1 - ease((s - g.len + .45) / .45)));
  }
  return 0;
}
export function createBouDance() {
  return {pose:bouPose,foot:planBouFeet(bouPose,0,timing.duration,gesture)};
}
