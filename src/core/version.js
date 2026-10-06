// The build's version (defined by vite.config.js): `1.0.54` and `1.0.54+d40502a`. Plain `dev` where nothing defines it (tests, tools).
export const APP_VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '0.0.0';
export const APP_BUILD = typeof __APP_BUILD__ === 'string' ? __APP_BUILD__ : `${APP_VERSION}+dev`;
