// What a build gets in place of the Tombairot's modules while it is unreleased (tools/deploy/unreleased-figure.mjs):
// every name the shared code imports from figures/tombairot/, as "no Tombairot". A name missing here fails the build.
export const tomba = null;
export const initTombaModel = () => {};
export const initTombaColla = () => null;
export const TOMBA_SCENE = null; // figure-scenes.js leaves a null out
export const TOMBA_SELECTOR_SVG = null;
