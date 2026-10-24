import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import * as THREE from 'three';

// The shared finale owns lights and fireworks only. Run its real owner with a
// separate scene so a decorative release pool fails even if initially hidden.
const scene = new THREE.Scene(), G = { finale: true };
const sun = new THREE.DirectionalLight(), hemi = new THREE.HemisphereLight();
const context = vm.createContext({ THREE, scene, G, sun, hemi, LIGHT: { sky: '#fff0dc', sun: '#ffe6bd' },
  renderProfile: { fireworks: 700 }, dummy: new THREE.Object3D(),
  rnd: (a, b) => (a + b) / 2, pick: values => values[0],
});
const source = readFileSync(new URL('../src/scene/fx.js', import.meta.url), 'utf8');
vm.runInContext(source.replace(/^import .*;\n/gm, '').replace(/^export /gm, ''), context);
const run = code => vm.runInContext(code, context);
const fireworks = run('fireworks');
assert.deepEqual(scene.children, [fireworks], 'the finale allocates only its fireworks, no decorative balloon pool');
run('animFinaleLights(0.1); firework(); animFireworks(1 / 60);');
assert(fireworks.visible && fireworks.count > 0, 'the retained fireworks still burst');
assert.notEqual(hemi.intensity, 1.6, 'the retained finale lights still pulse');
run('for (let i = 0; i < 180; i++) animFireworks(1 / 60);');
assert.equal(fireworks.visible, false, 'the retained sparks expire');
assert.deepEqual(scene.children, [fireworks], 'running the celebration never adds decorative release objects');
G.finale = false;
run('animFinaleLights(0);');
assert.equal(hemi.intensity, 1.6, 'leaving the finale restores the lights');
console.log('finale lights and fireworks only, no decorative balloon release ok');
