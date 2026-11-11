// How much this device draws, by the main game's own guess (render-quality.js, a copy of platform/render-quality.js until mulassa.cat moves onto this base): a weak or software GPU, a saved
// data mode, or a context lost here lately starts low, with no antialiasing, no shadows and 1x pixels. The rest keep Pop's
// look: on these chunky voxels a phone's 1.5x is enough (a 3x screen draws 2.25x the pixels of 2x for nothing).
import { initialQuality, probeRenderer, isSoftwareRenderer, gpuLossLevel } from './render-quality.js';

const coarse = matchMedia('(pointer: coarse)').matches, gpu = probeRenderer();
const level = isSoftwareRenderer(gpu) ? -1 : Math.min(gpuLossLevel(), initialQuality({ mobile: coarse, cores: navigator.hardwareConcurrency,
  memory: navigator.deviceMemory, saveData: navigator.connection?.saveData, renderer: gpu.renderer }));
export const LOW = level <= 0;
export const pixelRatio = () => Math.min(devicePixelRatio, LOW ? 1 : coarse ? 1.5 : 2); // re-read on fit: zoom, another screen
