// What a build gets in place of the Bou's modules while it is unreleased (tools/deploy/unreleased-figure.mjs): every name
// the shared code imports from figures/bou/, as "no Bou". A name missing here fails the build, never a silent stand-in.

export const bouFrame = () => {};
export const bou = null;
export const initBouModel = () => {};
export const initBouColla = () => null;
export const BOU_SCENE = null; // figure-scenes.js and crowd-effects.js leave a null out
export const BOU_CROWD = null;
