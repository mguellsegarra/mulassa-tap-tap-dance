// The crowd's neighbour grid (32 x 32 one-metre cells round the plaça): who stands where this frame, the soft
// neighbour search's cells and the hard no-overlap limit (separate).
import { PHOTO } from '../game/photo-control.js';
import { photoPersonClearance, photoExtras } from './photo-obstacles.js';
import { plaza } from './stage.js';
import { activeCrowd, bandSpots, midCrowd } from './quality.js';
import { FIGURE_SCENES } from './figure-scenes.js';
import { crowdAnchored } from './crowd-effects.js';
import { crowdRadius, backdropContacts } from './crowd-contact.js';

export const crowdCells = Array.from({ length: 32 * 32 }, () => []), usedCells = [];
const cellPush = (k, p) => { if (!crowdCells[k].length) usedCells.push(k); crowdCells[k].push(p); };
const crowdCell = p => Math.max(0, Math.min(31, Math.floor(p.pos.x + 16)))
  + 32 * Math.max(0, Math.min(31, Math.floor(p.pos.y + 16)));
export function recell(p) {
  const nextCell = crowdCell(p);
  if (nextCell === p.cell) return;
  const previous = crowdCells[p.cell];
  previous.splice(previous.indexOf(p), 1);
  cellPush(nextCell, p); p.cell = nextCell;
}
// The hard limit: no two footprints (RAD circles) ever overlap, whatever the forces did this frame (fleeing the rear,
// creeping in, the camera's wedge, the edge of the plaça). Overlapping pairs are pulled apart along the line between
// them, half each (all of it by a mover when the other is fixed: the band), and the velocity into
// the neighbour is dropped so they don't walk on the spot. Four sweeps over the nearby cells, including the larger mobility footprints.
export function separate() {
  for (let it = 0; it < 4; it++) {
    for (const p of activeCrowd) {
      if (p.rest || crowdAnchored(p)) continue; // at rest during the song (or charred stiff): only a mover can reach them, and resolves it
      const cellX = p.cell % 32, cellZ = Math.floor(p.cell / 32);
      for (let z = Math.max(0, cellZ - 2); z <= Math.min(31, cellZ + 2); z++) {
        for (let x = Math.max(0, cellX - 2); x <= Math.min(31, cellX + 2); x++) {
          for (const q of crowdCells[x + z * 32]) {
            if (q === p) continue;
            let sx = p.pos.x - q.pos.x, sz = p.pos.y - q.pos.y;
            const presence = Math.min(p.qualityScale ?? 1, q.qualityScale ?? 1);
            const min = crowdRadius(p) + crowdRadius(q) + 0.04 * presence, d2 = sx * sx + sz * sz;
            if (d2 >= min * min) continue;
            const d = Math.sqrt(d2);
            if (d > 1e-6) { sx /= d; sz /= d; } else { sx = Math.cos(p.ang); sz = Math.sin(p.ang); } // on top of each other: outwards
            const stiff = q.fixed || crowdAnchored(q), overlap = min - d;
            let pushP = overlap * (stiff ? 1 : 0.5), pushQ = stiff ? 0 : overlap * 0.5;
            if (PHOTO.on) { // neighbour separation must not undo a safe detour by pushing someone into a figure or tree
              const pBase = Math.min(0,photoPersonClearance(p,p.pos.x,p.pos.y))-1e-7;
              const qBase = stiff ? 0 : Math.min(0,photoPersonClearance(q,q.pos.x,q.pos.y))-1e-7;
              if (photoPersonClearance(p,p.pos.x+sx*pushP,p.pos.y+sz*pushP)<pBase) { pushP=0;pushQ=stiff?0:overlap; }
              if (pushQ && photoPersonClearance(q,q.pos.x-sx*pushQ,q.pos.y-sz*pushQ)<qBase) {
                pushQ=0;pushP=photoPersonClearance(p,p.pos.x+sx*overlap,p.pos.y+sz*overlap)>=pBase?overlap:0;
              }
            }
            p.pos.x += sx * pushP; p.pos.y += sz * pushP;
            const pv = p.vel.x * sx + p.vel.y * sz;
            if (pv < 0) { p.vel.x -= sx * pv; p.vel.y -= sz * pv; }
            if (!stiff) {
              q.pos.x -= sx * pushQ; q.pos.y -= sz * pushQ; q.rest = false; // nudged: it checks its own neighbours next
              const qv = q.vel.x * sx + q.vel.y * sz;
              if (qv > 0) { q.vel.x -= sx * qv; q.vel.y -= sz * qv; }
            }
          }
        }
      }
    }
    for (const p of activeCrowd) recell(p);
  }
}
// Use the existing neighbour grid when a walking spectator needs a detour, rather than stepping into the next person.
export function photoCrowdClearance(p, x, z) {
  let clear = photoPersonClearance(p,x,z);
  const cx = Math.floor(x+16), cz = Math.floor(z+16);
  for (let iz=Math.max(0,cz-2);iz<=Math.min(31,cz+2);iz++) for (let ix=Math.max(0,cx-2);ix<=Math.min(31,cx+2);ix++) {
    for (const q of crowdCells[ix+iz*32]) {
      if (q===p) continue;
      const presence=Math.min(p.qualityScale??1,q.qualityScale??1);
      clear=Math.min(clear,Math.hypot(x-q.pos.x,z-q.pos.y)-crowdRadius(p)-crowdRadius(q)-.04*presence);
    }
  }
  return clear;
}
// Everyone in their cell for this frame: the crowd, then the fixed footprints (the band, the shown collas, photo
// mode's extras, the backdrop's front); returns those backdrop contacts (settleDrawnCrowd needs them too).
export function fillCells() {
  for (const k of usedCells) crowdCells[k].length = 0; // only the cells used last frame, not all 1024
  usedCells.length = 0;
  for (const p of activeCrowd) { p.cell = crowdCell(p); cellPush(p.cell, p); }
  for (const b of bandSpots) cellPush(crowdCell(b), b); // the band: fixed, never in anyone's way
  for (const f of FIGURE_SCENES) if (f.colla()?.helpers.visible) for (const b of f.collaSpots) cellPush(crowdCell(b), b); // the shown figure's colla
  for (const p of photoExtras) if (!p.band) cellPush(crowdCell(p), p);
  const backgroundContacts = backdropContacts([plaza.backdrop, midCrowd]);
  for (const b of backgroundContacts) cellPush(crowdCell(b), b);
  return backgroundContacts;
}
