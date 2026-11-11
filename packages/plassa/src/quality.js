// How much this device draws, by the main game's own guess (render-quality.js, a copy of platform/render-quality.js until mulassa.cat moves onto this base): a weak or software GPU, a saved
// data mode, or a context lost here lately starts low, with no antialiasing, no shadows and 1x pixels. The rest keep Pop's
// look: on these chunky voxels a phone's 1.5x is enough (a 3x screen draws 2.25x the pixels of 2x for nothing).
import { initialQuality, probeRenderer, isSoftwareRenderer, gpuLossLevel, rememberGpuLoss, profileAt, renderDpr } from './render-quality.js';

const coarse = matchMedia('(pointer: coarse)').matches, gpu = probeRenderer();
const level = isSoftwareRenderer(gpu) ? -1 : Math.min(gpuLossLevel(), initialQuality({ mobile: coarse, cores: navigator.hardwareConcurrency,
  memory: navigator.deviceMemory, saveData: navigator.connection?.saveData, renderer: gpu.renderer }));
export const LOW = level <= 0;
// The pixel ratio, and with the canvas's CSS size (w, h) also the main game's pixel budget for this level (renderDpr): a big
// window at DPR 2 would be 3x the pixels of a phone's. Re-read on fit: zoom, another screen.
const profile = profileAt(level < 0 ? -1 : LOW ? 0 : coarse ? 1 : 2);
export const pixelRatio = (w = 1, h = 1) => renderDpr(profile, w, h, devicePixelRatio);
// A context lost on screen: the next loads start a level lighter for 12 hours (render-quality.js), as the main game does
export const lostGpu = () => { if (!document.hidden) rememberGpuLoss(Math.max(-1, level - 1)); };
