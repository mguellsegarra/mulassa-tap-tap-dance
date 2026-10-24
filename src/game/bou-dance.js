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
// Twice round (Marc 2026-10-24: «el bou ha d'anar més ràpid i corrent al ritme de la música»; «una mica més ràpid»; «el cercle s'ha d'obrir més»): r 3 m, ~2.7 m/s (faster, a carrier's stride outruns the other's feet), its carriers'
// steps on the half beats
export const LAP = { r: 3, from: 73, beats: 34, turns: 2, ease: .15, a0: Math.PI / 2 }; // a0: its S point, where it faces its way already (E)
// The colla's part in the festa, in song beats: they come in from their marks, grip and lift it (`lift` m) over their
// heads in a single heave on bar 71's last beat: up on bar 72's downbeat, where the music's festa starts (Marc
// 24/10/2026: «no agafen el bou en el moment que comença el compàs»), its nose up (`rear` rad), pump it on the beat (`pump` m) and rock it (`wobble`
// rad), lower it and walk back (scene/bou-colla.js carries it,
// scene/bou-parade.js runs the public behind it). The videos (2xG98OA1QqI 208-228 s, G_R-ZvzS95k 200-215 s, Klr8m3U6qzg
// 216-232 s): raised at arm's length, the front well up, everyone's hands up under it.
export const BOU_CARRY = { come: at(71), grip: at(71,3), up: at(72), lower: at(81,2), down: at(83,2), back: at(85,2), lift: .75, rear: .3, pump: .1, wobble: .07, buck: .1,
  lap: [at(LAP.from), at(LAP.from) + LAP.beats] };
// 0-1, how far into the festa's carry (the colla coming in to walking back), eased: the play camera holds the whole ring
export function bouFestaAt(beat) {
  const r = (a, b) => ease((beat - a) / (b - a));
  return r(BOU_CARRY.come, BOU_CARRY.up) * (1 - r(BOU_CARRY.lower, BOU_CARRY.back));
}
// the share of the laps' time by which a share `f` of their way is run: steady, but setting off and pulling up over
// `LAP.ease` of it (from standing, evenly spaced keys made it 0 -> 2.8 m/s in a third of a second)
function lapTime(f) { // (constant acceleration over `ease`, then steady: the inverse of the way run in a time)
  const e = LAP.ease, one = g => g < e / (2 * (1 - e)) ? Math.sqrt(2 * e * (1 - e) * g) : g * (1 - e) + e / 2;
  return f <= .5 ? one(f) : 1 - one(1 - f);
}
// its inverse: the share of the laps' way run at song beat `beat` (scene/bou-parade.js runs the public on the same clock)
export function lapWay(beat) {
  const e = LAP.ease, k = 2 * e * (1 - e), t = Math.min(1, Math.max(0, (beat - at(LAP.from)) / LAP.beats));
  return t < e ? t * t / k : t > 1 - e ? 1 - (1 - t) * (1 - t) / k : (t - e / 2) / (1 - e);
}
const LAPS = 2 * PI * (LAP.turns - 1); // the extra laps' turn, carried on to the end (it still ends facing W)
// How far its rushes go (m from the plaça's centre): head-on at an attendant (5.5 m out) its muzzle stops a hand short of
// them after the skid's slide; side-on its flank; the diagonal into the gap between two; the slow arc to N, the turn to E
const RUSH = { head: 2.25, side: 4.1, diag: 2.4, arc: 2.6, turn: 1.9 };
// The opening's slow turns (Marc's reference, 24/10/2026): the rear carrier nearly turns on the spot and the front one
// walks the arc, so the rump hardly moves and the head swings round; in seven beats, so its feet have settled for the
// next bar's leg swing. Keys on each beat of `beats` from bar `n`, the rump at
// (0, -RUMP) (where it stands facing W at bar 3: still in the middle through the long notes).
const RUMP = .4; // m behind its middle, under the rear carrier's front (on the rear carrier itself, .66, the front one's steps
// turned into a sprint: 8.5 m/s feet; here 5.7, the rear carrier stepping round a 0.26 m circle)
const pivot = (n, beats, from, to) => Array.from({ length: beats }, (_, k) => {
  const a = from + (to - from) * (1 - Math.cos(PI * (k + 1) / beats)) / 2; // a gentle ease: the front carrier walks it
  return [n, k + 1, a, RUMP * Math.sin(a), RUMP * (Math.cos(a) - 1)];
});
// [bar, beats into it, yaw, x, z]: equal neighbours hold, a reversal stops (monotone Hermite, bou-feet.js)
const PATH = [
  [0,0, 0,0,0], [1,0, 0,0,0],
  // 1-2: facing W, still in the middle, the long notes' leg swings (GESTURES); 3-4: half a turn (via S) to face E on its rump (pivot)
  [3,0, 0,0,0], ...pivot(3, 7, 0, PI),
  // 5-6: facing E, the same, head down on the beat; 7-8: on round (via N) on the same spot of the rump, to face W
  [7,0, PI,0,-2*RUMP], ...pivot(7, 7, PI, 2*PI), [9,0, 2*PI,0,0],
  // 9-12: a whole turn, front and rump rising in turn; 13-16: unwound the other way
  [13,0, 4*PI,0,.05], [18,0, 2*PI,0,0],
  // 18: a short bar, nearly in place, bouncing
  [19,0, 2*PI,.05,.1],
  // 19-22: a wind-up, then a rush out to W almost onto its attendant, a skid (SKIDS); backs off, turns round there (via
  // N) to face E and rushes E the same way (Marc 24/10/2026: «ha d'arribar quasi a tocar les persones que estan a NSWE,
  // més ràpid i en to humorístic, derrapant»)
  // (every arrival on a bar's downbeat, the music's accent)
  [19,1, 2*PI,.03,.25], [20,0, 2*PI,0,RUSH.head], [20,2, 2*PI,0,RUSH.head-.5], [21,2, PI,-.1,RUSH.head-.8],
  [22,0, PI,-.05,1.5], [23,0, PI,0,-RUSH.head], [23,2, PI,0,-RUSH.head+.5],
  // 24-26: back to the middle with the other half turn (via S) to W, then bouncing in place for the drop
  [25,2, 0,.08,0], [27,0, 0,0,0],
  // 27-34, the «techno»: facing W, pulsed side-steps on the beat (WARP), each a rush almost onto an attendant and a skid:
  // out to W and back, sideways to S and back, to N and back, a diagonal and back
  // (a bar out, a bar back: faster, the pulsed steps would outrun the carriers' legs)
  [28,0, 0,0,RUSH.head], [28,1, 0,0,RUSH.head-.3], [29,0, 0,0,0],
  [30,0, 0,RUSH.side,0], [30,1, 0,RUSH.side-.3,0], [31,0, 0,0,0],
  [32,0, 0,-RUSH.side,0], [32,1, 0,-RUSH.side+.3,0], [33,0, 0,0,0],
  [34,0, 0,-RUSH.diag,RUSH.diag], [34,1, 0,-RUSH.diag+.2,RUSH.diag-.2], [35,0, 0,0,0],
  // 35-38: a rush forward to W and a skid; backing off, half a turn (via S) to face E
  [35,2, 0,0,.4], [37,0, 0,0,RUSH.head], [37,2, 0,0,RUSH.head-.5], [38,2, PI,.2,RUSH.head-.9], [39,0, PI,.1,1.4],
  // 39-42: facing E, a turn and a quarter the other way (via N) while it comes back to the middle: faces S
  [43,0, -1.5*PI,0,0],
  // 43-45: a rush out to S and a skid; backing off, it turns back (via E) and heads N; 47: the turn carries on, a
  // side-step, to W
  [43,1, -1.5*PI,.3,0], [44,0, -1.5*PI,RUSH.head,0], [44,2, -1.5*PI,RUSH.head-.5,0],
  [47,0, -.5*PI,.7,-.1], [60,0, 0,.3,.1],
  // 60-63: near W, short steps, the fermata breathing (the beat itself slows); 61-62 held for the leg swings (GESTURES)
  [61,0, .1,.15,.15], [63,0, .1,.15,.15], [64,0, 0,0,0],
  // 64-67: very slow, speeding up with the music: a progressive arc out to N, turning to face E
  [65,0, .15,-.05,.3], [66,0, .45*PI,-1.2,1], [68,0, PI,-RUSH.arc,.15],
  // 68-71: out and back with nearly a whole turn, ending near the middle
  [70,0, 2*PI,-.1,-RUSH.turn], [71,0, 3*PI,0,0],
  // 72-83, the festa (Marc 24/10/2026): in the middle facing E while the colla comes in and lifts it (BOU_CARRY); carried
  // out sideways to S, then once round the plaça on LAP (S -> E -> N -> W -> S: Marc's N W S E round, facing its way) with
  // part of the public running behind (scene/bou-parade.js); back to the middle, set down
  [72,0, 3*PI,0,0], [73,0, 3*PI,LAP.r,0],
  ...Array.from({ length: 16 * LAP.turns }, (_, k) => { const a = LAP.a0 + PI * (k + 1) / 8, b = LAP.beats * lapTime((k + 1) / (16 * LAP.turns));
    return [LAP.from + Math.floor(b / 4), b % 4, 2*PI + a + PI / 2, LAP.r * Math.sin(a), LAP.r * Math.cos(a)]; }),
  [83,2, 5*PI+LAPS,0,0],
  // 84-91: the turn unwinds, quieter, back to W; 92: the middle, facing W
  [86,2, 4.5*PI+LAPS,.25,.1], [88,0, 4.5*PI+LAPS,.25,.1], [91,0, 4*PI+LAPS,0,0],
];
const SWING = { out: .7, hold: 1.4, cross: 1, back: 3.2, len: 3.9, kick: .07, knee: .12 }; // beats; kick: rad, the front's lift
// while out; knee: m the foot rises on each of its three moves (out, through, home), a step with the knee up, not a slide
// [bar, beats in, leg ('R' right = feet 0 and 2, 'L' left = 1 and 3), beats out, way]: a leg stretched forward, heel
// down, toe up (way 1), or back on its toes (-1), both carriers together; way 'swing' (SWING): the front carrier's leg
// alone, forward on the bar's long note and swung back on its second (Marc 24/10/2026 and his reference video: the
// rear carrier stands), the left leg first, then the right. The calderó (61-62) the same.
const GESTURES = [
  [1,0,'L',SWING.len,'swing'], [2,0,'R',SWING.len,'swing'], [5,0,'L',SWING.len,'swing'], [6,0,'R',SWING.len,'swing'],
  [19,0,'R',1.5], [19,2,'L',1.5], [20,0,'R',1.5], [20,2,'L',1.5], [22,0,'R',1.5], [22,2,'L',1.5],
  [35,0,'R',1.5], [35,2,'L',1.5], [36,0,'R',1.5], [36,2,'L',1.5],
  [61,0,'L',SWING.len,'swing'], [62,0,'R',SWING.len,'swing'],
].map(([n, b, leg, len, way = 1]) => ({ start: at(n, b), len, side: leg === 'R' ? 0 : 1, way }));
// The comic layer per phrase: [bar, beats in, dip (m, knees on the beat), sway (rad a side a beat), nod (rad, front
// down on the dip), see-saw (rad, front up / rump up on alternate beats), warp (0-1: the path moves between beats and
// eases on them)]. Eased from key to key. The dip always covers the see-saw (front hips never rise past the legs' reach).
const DIP = 1.25; // the dips read small at the play camera's distance
// (the intro only bounces and waddles: no nod nor see-saw before the tune, Marc 24/10/2026: «s'aixeca massa aviat»)
const COMIC = [
  [0,0, .03,.02,0,0,0], [1,0, .015,.005,.01,0,0], [2,3, .015,.005,.01,0,0], [3,0, .05,.03,.02,0,0], [4,3, .05,.03,.02,0,0],
  [5,0, .015,.005,.01,0,0], [6,3, .015,.005,.01,0,0], [7,0, .05,.03,.04,0,0], [8,3, .05,.025,.02,0,0],
  [9,0, .06,.02,.01,.13,0], [18,-.5, .06,.02,.01,.13,0], [18,0, .055,.04,.02,0,0],
  [19,0, .05,.055,.02,0,0], [23,0, .05,.035,.02,0,0], [26,0, .07,.045,.03,0,0],
  [27,0, .09,.045,.03,0,.4], [34,3, .09,.045,.03,0,.4], // (warp .4: the rushes pulsed harder outran the carriers' legs) [35,0, .05,.05,.02,0,0],
  [39,0, .05,.035,.02,0,0], [60,0, .045,.045,.02,0,0], [61,0, .015,.005,.01,0,0], [62,3, .015,.005,.01,0,0], [63,0, .045,.045,.02,0,0], [64,0, .05,.03,.02,0,0], [68,0, .06,.04,.02,0,0],
  [72,0, .08,.05,.02,.04,0], [84,0, .055,.035,.02,0,0], [88,0, .04,.025,.015,0,0], [92,0, .03,.02,.01,0,0],
].map(([n, b, dip, ...v]) => [at(n, b), DIP * dip, ...v]);
const track = (keys, c) => keys.map(k => [at(k[0], k[1]), k[c]]);
const YAW = track(PATH, 2), X = track(PATH, 3), Z = track(PATH, 4);
const LIFT = [[0,0],[BOU_CARRY.grip,0],[BOU_CARRY.up,BOU_CARRY.lift],[BOU_CARRY.lower,BOU_CARRY.lift],[BOU_CARRY.down,0],[at(92),0]];
// The skid at the end of each rush (a cartoon stop): it slides on `slide` m past where it was going and settles back,
// fishtails (its rear swinging out `tail` rad to one side then the other, dying away) and sits back on its haunches
// (front up `sit` rad) while it brakes; over `len` beats from a little before it arrives.
const SKID = { slide: .3, tail: .22, sit: .12, len: 1.6, lead: .3, wag: 1 };
const SKIDS = [[20,0,1],[23,0,-1],[28,0,1],[30,0,-1],[32,0,1],[34,0,-1],[37,0,1],[44,0,-1]].map(([n, b, side]) => {
  const t = at(n, b), dx = sampleTrack(X, t) - sampleTrack(X, t - .3), dz = sampleTrack(Z, t) - sampleTrack(Z, t - .3), d = Math.hypot(dx, dz) || 1;
  return { t, dx: dx / d, dz: dz / d, side };
});
function skid(beat, out) {
  for (const k of SKIDS) {
    const s = beat - k.t; if (s < -SKID.lead || s > SKID.len) continue;
    const u = (s + SKID.lead) / (SKID.len + SKID.lead), b = Math.sin(PI * u) ** 2; // out and back, smooth both ends
    out.x += k.dx * SKID.slide * b; out.z += k.dz * SKID.slide * b; out.pitch -= SKID.sit * b;
    if (s > 0) out.yaw += k.side * SKID.tail * Math.sin(2 * PI * s / SKID.wag) * (1 - Math.exp(-s * s / .02)) * Math.exp(-2 * s);
  }
}
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
const SAW_RISE = 1.0; // m of lift a radian of see-saw: the low end's hem (~1 m from the middle) holds its height
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
  out.pitch=k*comic(beat,3)*dip; // + = front down
  skid(beat,out); // (the rushes' stops; its sit counts in the hem's room below)
  // x3 would sweep the hem into the shoes: the dip, see-saw and waddle together never lower the skirt over the feet
  // (43 cm up, within 0.9 m fore and aft of the middle, 0.3 m to a side) past HEM_DROP; scaled as one, so the shape stays.
  const drop=-out.lift+.9*Math.abs(out.pitch)+.3*Math.abs(out.roll), fit=drop>HEM_DROP?HEM_DROP/drop:1;
  out.lift*=fit;out.pitch*=fit;out.roll*=fit;
  // the see-saw (Marc 24/10/2026: «més exagerat, com la Mulassa, que es veuen les cames com s'allarguen»): the front, then
  // the rump, heaved high on alternate beats; the body rises as far as the low end would sink, so that end stays where
  // it was and the high one shows its carrier's legs (and trunk, scene/bou-rig.js) under the lifted hem
  const saw=-k*comic(beat,4)*Math.cos(PI*beat);
  out.pitch+=saw;out.lift+=SAW_RISE*Math.abs(Math.sin(saw));
  // the front carrier's leg out in front (SWING): its front lifts a touch, on the rear carrier, so the straight leg comes
  // out under the hem, not through the cloth (a rigid skirt: in the reference video the cloth gives)
  const kick=SWING.kick*frontKick(beat);out.pitch-=kick;out.lift+=.66*Math.sin(kick);
  // carried by the colla, the carriers stand straight under it (scene/bou-rig.js), the nose up; pumped on the beat
  const up=carried/BOU_CARRY.lift;
  // frantic up there (Marc 2026-10-24: «ha de ser tot més frenètic»): heaved on every beat, rocking side to side and
  // bucking nose up on alternate beats
  out.lift+=carried-BOU_CARRY.pump*up*(1-dip);out.pitch-=up*(BOU_CARRY.rear+BOU_CARRY.buck*Math.sin(PI*beat));out.roll+=up*BOU_CARRY.wobble*Math.sin(PI*beat+PI/4);
  out.beat=beat;return out;
}
// The swing in beats from the bar's start: out with the long note, swung back through (brushing the floor) to arrive
// just after its second note (beat 2), held, and home before the next bar; eased throughout, nothing sudden.
function swing(s) {
  const k = SWING;
  return s < k.hold ? ease(s / k.out) : s < k.hold + k.cross ? 1 - 2 * ease((s - k.hold) / k.cross)
    : s < k.back ? -1 : -1 + ease((s - k.back) / (k.len - k.back));
}
// m the swinging foot is up at song second t (an arc on each move of the swing, flat while it holds)
function swingRaise(t, index) {
  if (index < 2) return 0;
  const beat = beatAtTime(timing.subdivisionTimes, Math.max(0, t)) / timing.subdivision, k = SWING;
  for (const g of GESTURES) if (g.way === 'swing' && g.side === index % 2) {
    const s = beat - g.start; if (s > 0 && s < g.len) return k.knee * swingArc(s);
  }
  return 0;
}
// 0-1: the swing's knee up, an arc on each move (out, through, home)
function swingArc(s) {
  const k = SWING, arc = (a, b) => (s > a && s < b ? Math.sin(PI * (s - a) / (b - a)) : 0);
  return arc(0, k.out) + arc(k.hold, k.hold + k.cross) + arc(k.back, k.len);
}
// 0-1: how far the front carrier's leg is out in front or its knee up, at song beat `beat`
function frontKick(beat) {
  for (const g of GESTURES) if (g.way === 'swing') { const s = beat - g.start; if (s > 0 && s < g.len) return Math.max(0, swing(s), swingArc(s)); }
  return 0;
}
// 0-1: how far leg `index` is stretched at song second t (a quick reach, held, a quick fold); negative: back
function gesture(t, index) {
  const beat = beatAtTime(timing.subdivisionTimes, Math.max(0, t)) / timing.subdivision;
  for (const g of GESTURES) if (g.side === index % 2) {
    const s = beat - g.start;
    if (s > 0 && s < g.len && g.way === 'swing') { if (index > 1) return swing(s); continue; }
    if (s > 0 && s < g.len) return g.way * clamp(Math.min(ease(s / .4), 1 - ease((s - g.len + .45) / .45)));
  }
  return 0;
}
export function createBouDance() {
  return {pose:bouPose,foot:planBouFeet(bouPose,0,timing.duration,gesture,swingRaise)};
}
