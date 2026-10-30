// The game's systems running together in a mocked DOM (main.js and every module it reaches, as ONE script: load-main.mjs),
// shared by the contract files render-quality.mjs runs in order (one module instance: one game for all of them).
import { loadMainSource } from './load-main.mjs';
import { PROFILES, sessionProfile, initialQuality, renderDpr, frameMonitor, hudScale, framePacer, profileAt, hudBudget, smoothClock, isSoftwareRenderer, probeRenderer, gpuLossLevel, rememberGpuLoss } from '../../src/platform/render-quality.js';
import { buildPerson } from '../../src/scene/models.js';

// Execute the actual scene/simulation with Three.js geometry and a CPU renderer stub.
// This checks integration without requiring a GPU or adding production-only test hooks.
const { readFileSync } = await import('node:fs');
const vm = await import('node:vm');
const THREE = await import('three');
const models = await import('../../src/scene/models.js');
const chart = await import('../../src/game/chart.js');
const mainSource = loadMainSource();
const progress = await import('../../src/game/progress.js');
const stars = await import('../../src/hud/stars.js');
const practice = await import('../../src/game/practice.js');
const energy = await import('../../src/game/energy.js');
const bubblesLogic = await import('../../src/game/bubble-rules.js');
const framing = await import('../../src/scene/framing.js');
const dance = await import('../../src/game/dance.js');
const logoMotionLogic = await import('../../src/hud/logo-motion.js');
const orbitLogic = await import('../../src/scene/orbit.js');
const leaderboardResult = await import('../../src/services/leaderboard-result.js');
const shareLogic = await import('../../src/services/share.js');
const { setupShare } = await import('../../src/ui/share-ui.js');
const { setupLoader } = await import('../../src/ui/loader.js');
const { errors, errorName } = await import('../../src/services/errors.js'); // the real one: off here (no window, no DSN)
const loaderTimers = []; // #loader's delays, run by hand: flushLoader()
const flushLoader = () => { while (loaderTimers.length) loaderTimers.shift()(); };
const nodes = new Map();
const keyHandlers = [];
const windowHandlers = {};
const drawnText = [];
const hudWork = { ops: 0, clears: 0 }; // every read of a canvas method or property («mode foto» draws nothing)
const drawing = new Proxy({}, { get: (_, key) => (hudWork.ops++, key === 'clearRect' && hudWork.clears++, key === 'fillText') ? value => drawnText.push(value)
  : key === 'measureText' ? s => ({ width: String(s).length * 6 }) : key === 'createLinearGradient' ? () => ({ addColorStop() {} }) : () => {}, set: () => true });
const document = {
  hidden: false,
  focused: true,
  hasFocus() { return this.focused; },
  listeners: {},
  addEventListener(type, handler) { const previous = this.listeners[type]; this.listeners[type] = previous ? (...args) => { previous(...args); handler(...args); } : handler; },
  body: { appendChild() {}, classList: { contains: () => false, toggle() {} }, style: { setProperty() {}, removeProperty() {} } },
  documentElement: { toggleAttribute() {} }, // (focus.js: <html data-keys>)
  createElement: () => ({ style: { setProperty() {} }, dataset: {}, after() {}, click() {}, setAttribute() {}, appendChild() {}, addEventListener() {}, contains: () => false, querySelectorAll: () => [], querySelector: () => ({ style: { setProperty() {} }, classList: { toggle() {} } }) }), // (ui/free-music.js listens on its own button; ui/photo-stick.js draws its stick)
  getElementById(id) {
    if (!nodes.has(id)) nodes.set(id, {
      style: { setProperty() {} }, dataset: {}, options: [{}, {}], listeners: {}, open: false, toggleAttribute() {}, // (#free dances on the menu beat: controls.js freeDance)
      addEventListener(type, handler) { // the DOM runs every listener of a type (the HUD's contextrestored has two owners)
        const prev = this.listeners[type];
        this.listeners[type] = prev ? (...args) => { prev(...args); return handler(...args); } : handler;
      },
      showModal() { this.open = true; }, close() { this.open = false; },
      focus() {}, blur() {}, setAttribute() {}, classList: { toggle() {}, add() {}, remove() {} }, contains: () => false, after() {},
      getContext: () => drawing, getBoundingClientRect: () => ({ left: 10, top: 10, right: 54, bottom: 54, width: 44, height: 44 }), // (the radio sits by #viewmode)
    });
    return nodes.get(id);
  },
  querySelectorAll: () => [],
};
// Model node ownership so the real sheet handlers must move content both ways.
const privacyTextStub = { textContent: 'Privacy content' };
const privacyFragmentStub = { childNodes: [privacyTextStub], append(...children) {
  this.childNodes.push(...children); privacyBodyStub.childNodes.length = 0;
} };
const privacyBodyStub = { childNodes: [], append(fragment) {
  this.childNodes.push(...fragment.childNodes); fragment.childNodes.length = 0;
}, scrollTop: 0 };
const privacyMenuStub = document.getElementById('privacy-menu');
privacyMenuStub.querySelector = () => privacyBodyStub;
privacyMenuStub.close = function () { this.open = false; this.listeners.close(); };
document.getElementById('privacy-content').content = privacyFragmentStub;
class Renderer {
  constructor() { this.shadowMap = {}; this.lost = false; }
  getContext() { return { isContextLost: () => this.lost }; }
  setPixelRatio() {}
  setSize() {}
  render() {}
}
const context = vm.createContext({
  ...leaderboardResult, leaderboard: { configured: true },
  ...await import('../../src/figures/drac/dance-drac.js'), ...await import('../../src/figures/drac/drac-feet.js'), ...await import('../../src/figures/drac/drac-motion.js'), ...await import('../../src/figures/drac/drac.js'),
  // the Drac's revised dance (pure modules, provided like the old one): only the names the inlined scene code uses
  poseAt: (await import('../../src/figures/drac/drac-pose.js')).poseAt, REF_END: (await import('../../src/figures/drac/drac-pose.js')).REF_END, feetAt: (await import('../../src/figures/drac/drac-steps.js')).feetAt,
  dracTime: (await import('../../src/figures/drac/drac-time.js')).dracTime, ...await import('../../src/figures/drac/drac-layout.js'), ...await import('../../src/figures/drac/drac-rig.js'), ...await import('../../src/figures/drac/drac-groove.js'), ...await import('../../src/figures/drac/drac-colla.js'), ...await import('../../src/figures/common/colla.js'), ...await import('../../src/figures/mulassa/mula-colla.js'), ...await import('../../src/figures/bou/bou-colla.js'),
  buildBou: (await import('../../src/figures/bou/bou.js')).buildBou, createBouMotion: (await import('../../src/figures/bou/bou-motion.js')).createBouMotion, ...await import('../../src/figures/bou/bou-dance.js'), liveBouFeet: (await import('../../src/figures/bou/bou-feet.js')).liveBouFeet, // the Bou (provided)
  ...await import('../../src/dev/final-test.js'), MOCK_BOARD: false, ALIAS_KEY: 'leaderboard-alias', // ?final: off here (no hostname)
  errors, errorName, audioFailureTags: (await import('../../src/platform/audio-load.js')).audioFailureTags,
  THREE: { ...THREE, WebGLRenderer: Renderer }, ...await import('../../src/scene/crowd-fx.js'), ...models, ...chart, ...progress, ...stars,
  PROFILES, sessionProfile, initialQuality, renderDpr, frameMonitor, hudScale, framePacer, smoothClock, profileAt, hudBudget, isSoftwareRenderer, probeRenderer, gpuLossLevel, rememberGpuLoss, Chip: class { constructor(song, opts) { context.chipOpts = opts; } menu() {} setMenuMusic(on) { (context.menuMusicCalls ||= []).push(on); } }, ...practice, ...energy, ...bubblesLogic, ...framing, ...dance, ...logoMotionLogic, ...orbitLogic, setupSync: hooks => { context.syncHooks = hooks; return context.syncSheet = { open: false, show() { this.open = true; } }; },
  pixelSvg: () => '<svg></svg>', // src/ui/select-ui.js (provided)
  curtain: swap => swap(), curtainCover() {}, // src/ui/curtain.js (provided: its timing is tests/ui/curtain.mjs's; here free play's switch runs at once)
  setupSelect: opts => (context.selectScreen = { opts, sheetOpen: false, visible(on) { this.shown = on; }, refocus() {} }),
  setupBoard: opts => (context.boardSheet = { opts, open: false, configured: true, shown: [], opened: [], results(show) { this.shown.push(show); }, publishable: false,
    openBoard(back) { this.open = true; this.opened.push(back); this.back = back; }, verifyStarts: 0, verifyStart() { this.verifyStarts++; },
    settingsRefreshed: 0, refreshSettings() { this.settingsRefreshed++; }, openPublish(o) { this.publishOpened = o; },
    standings: [], standing(figure) { this.standings.push(figure); return Promise.resolve(null); } }), // src/ui/board-ui.js has its own DOM tests (tests/ui/board-ui.mjs)
  song: JSON.parse(readFileSync(new URL('../../src/song-mulassa.json', import.meta.url))),
  dracShareSong: JSON.parse(readFileSync(new URL('../../src/song-drac.json', import.meta.url))),
  ...shareLogic, // the real Comparteix sheet on the mocked DOM (no canvas here: the image fails quietly)
  setupLoader: doc => setupLoader(doc, { timers: { setTimeout: f => loaderTimers.push(f), clearTimeout() {} } }),
  sheetFades() {}, // src/ui/sheet-fade.js: scroll fades of the sheets, pure DOM
  setupProfile: () => ({ isOpen: false, open() {}, refresh() {} }), // src/ui/profile-ui.js
  // the Perfil, the seasons and the cards (their DOM: tests/ui/account-ui.mjs); the statistics' upload (tests/services/stats-sync.mjs)
  setupAccount: () => (context.accountSheet = { isOpen: false, opened: 0, open() { this.opened++; }, notice: () => false }),
  setupSeasons: () => ({ isOpen: false, open() {} }), setupSeasonEnd: () => ({ isOpen: false, check: async () => false, news: async () => null }), setupCard: () => ({ isOpen: false, open() {} }),
  statsSync: { use() {}, holdWhile(fn) { context.statsHold = fn; }, init: async () => {}, afterRun() { context.statsAfterRuns = (context.statsAfterRuns || 0) + 1; }, acceptNotice() {}, noticeNeeded: () => false }, markStatsNoticeSeen() {},
  loadPhoto: () => Promise.resolve(null), // src/hud/share-card.js: the share card's fixed photo (none here: the stand-in sky)
  setupFeedback: opts => (context.feedbackSheet = { opts, open: false, configured: true, shown: 0, show(back) { this.open = true; this.shown++; this.back = back; } }), // src/ui/feedback-ui.js: tests/ui/feedback-ui.mjs
  dropLegacyIdentity() {}, // src/services/leaderboard-identity.js: tests/services/leaderboard.mjs
  refreshIdentity: (service, kv) => { (context.identityAsked ||= []).push(kv); return Promise.resolve(); }, // src/ui/board-list.js: tests/ui/account-ui.mjs
  setupShare: opts => (context.shareSheet = setupShare({ ...opts, doc: document, nav: {}, fonts: null, url: { createObjectURL: () => 'blob:card', revokeObjectURL() {} } })),
  document, navigator: { hardwareConcurrency: 8, deviceMemory: 8 },
  location: { hostname: 'localhost', search: '?representation=off' }, localStorage: { getItem() {}, setItem() {} }, // this mocked DOM supplies the original cast; representation-motion tests the new rigs
  matchMedia: () => ({ matches: false, addEventListener() {} }), addEventListener(type, handler) {
    (windowHandlers[type] ||= []).push(handler);
    if (type === 'keydown') keyHandlers.push(handler);
  },
  innerWidth: 1280, innerHeight: 720, screen: { width: 1280, height: 720 }, devicePixelRatio: 1,
  URLSearchParams, performance: { now: () => 0 }, requestAnimationFrame() {}, window: {}, setTimeout() {}, clearTimeout() {}, setInterval() {},
});
// The vm context has its own Math; models.js's rnd()/pick() (buildPerson, placeHome...) are this realm's, so the
// tests below seed BOTH (they stay seeded from here on): `seedR = n` inside the context and hostSeed(n) here (else crowd variety is unseeded).
const hostSeed = n => { let s = n; Math.random = () => (s = (s * 16807) % 2147483647) / 2147483647; };
hostSeed(5); vm.runInContext('var seedR = 5, seeded = () => (seedR = (seedR * 16807) % 2147483647) / 2147483647, mathRandom = Math.random; Math.random = seeded;', context);
vm.runInContext(mainSource, context);
// The camera-fit silhouettes are test-only (the game no longer computes them): they fold her, so the last call restores the standing pose.
vm.runInContext(`// Fit each part separately: a single tall box wastes the empty space above her back. The margins are the dance's reach
// (dance.js): the front thrown up by a jump (the rear stays down: 0.4 m per m towards the front) and the swing of a lean.
function silhouettePoints(collapse = 0) { // prepared once; the head folds beyond the standing footprint
  mula.neck.rotation.x = 0.15 + collapse * 1.2; mula.head.rotation.x = 0.2;
  mula.jaw.rotation.x = collapse * 0.6 + 0.12;
  for (const ear of mula.ears) ear.rotation.x = -0.25 + collapse * 0.9;
  mula.body.rotation.z = collapse * 0.25; mula.root.position.y = -collapse * 0.42;
  mula.root.updateMatrixWorld(true);
  const points = [], p = new THREE.Vector3();
  mula.root.traverse(m => {
    if (!m.isMesh) return;
    m.geometry.computeBoundingBox(); const b = m.geometry.boundingBox;
    for (let i = 0; i < 8; i++) {
      p.set(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z).applyMatrix4(m.matrixWorld);
      const rise = 0.45 + Math.max(0, 0.4 * (p.z + 1.6)), swing = Math.max(0, 0.47 * (p.y - 0.9));
      points.push(p.x, p.y + rise, p.z, p.x - swing, p.y, p.z, p.x + swing, p.y, p.z, p.x, Math.max(-0.05, p.y - 0.5), p.z); // (never below the floor: it hides that)
    }
  });
  return new Float32Array(points);
}
const COLLAPSE_POINTS = new Float32Array([...silhouettePoints(0.5), ...silhouettePoints(0.8), ...silhouettePoints(1)]);
const MULA_POINTS = silhouettePoints();
`, context);
const run = source => vm.runInContext(source, context);

export { readFileSync, vm, THREE, models, chart, mainSource, progress, stars, practice, energy, bubblesLogic, framing, dance, logoMotionLogic, orbitLogic, leaderboardResult, shareLogic, setupShare, setupLoader, errors, errorName, loaderTimers, flushLoader, nodes, keyHandlers, windowHandlers, drawnText, hudWork, drawing, document, privacyTextStub, privacyFragmentStub, privacyBodyStub, privacyMenuStub, Renderer, context, hostSeed, run };
