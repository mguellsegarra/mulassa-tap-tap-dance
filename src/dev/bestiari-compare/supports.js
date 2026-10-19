import { shoeSeparation } from './support-clearance.js';
// Four human carriers in two rows. The carried shell requires coordinated steps.
export const SUPPORT_LAYOUT = [1.05, -1.05].flatMap(z => [.2, -.2].flatMap(x => [.1, -.1].map(dx => ({ x: x + dx, z }))));
const ease = u => u ** 3 * (10 - 15 * u + 6 * u * u);

export function planSupports(poseAt, end = 166.2) {
  const pose = {}, sample = {}, ahead = {}, events = SUPPORT_LAYOUT.map(() => []);
  function nominal(t, index, out) {
    poseAt(t, pose);
    const point = SUPPORT_LAYOUT[index], c = Math.cos(pose.yaw), s = Math.sin(pose.yaw);
    const x = point.x * Math.cos(pose.roll) + .1 * Math.sin(pose.roll);
    const y = point.x * Math.sin(pose.roll) - .1 * Math.cos(pose.roll);
    const z = y * Math.sin(pose.pitch) + point.z * Math.cos(pose.pitch);
    out.x = pose.x + x * c + z * s; out.z = pose.z - x * s + z * c; out.yaw = pose.yaw;
    return out;
  }
  const initial = SUPPORT_LAYOUT.map((_, i) => ({ ...nominal(0, i, {}) }));
  const planted = initial.map(p => ({ ...p })), targets = initial.map(p => ({ ...p }));
  const separation = {}, candidate = {}; let freeAt = 0, next = 0;
  for (let frame = 1; frame / 100 < end - .35; frame++) {
    const t = frame / 100; if (t < freeAt) continue;
    let needed = false;
    for (let i = 0; i < 8; i++) {
      nominal(t, i, sample);
      if (Math.hypot(sample.x - planted[i].x, sample.z - planted[i].z) > .075 || Math.abs(sample.yaw - planted[i].yaw) > .15) needed = true;
    }
    if (!needed) continue;
    poseAt(t, sample); poseAt(t + .1, ahead);
    const turnSpeed = Math.abs(ahead.yaw - sample.yaw) / .1, travelSpeed = Math.hypot(ahead.x - sample.x, ahead.z - sample.z) / .1;
    const duration = Math.max(.06, .24 / (1 + turnSpeed * 1.5 + travelSpeed * .65));
    for (let i = next; i < 8; i += 2) nominal(t + duration, i, targets[i]);
    // Each carrier places one foot beside their own stance foot. A shared offset
    // pushed an entire row sideways when front/back carriers turned in opposite arcs.
    for (let i = next; i < 8; i += 2) {
      let found = false;
      const target = { ...targets[i] };
      for (let ring = 0; ring <= 14 && !found; ring++) {
        for (let a = 0; a < (ring ? 2 : 1); a++) {
          const dx = 0, dz = (a ? -1 : 1) * ring * .02;
          candidate.x = target.x + dx * Math.cos(target.yaw) + dz * Math.sin(target.yaw);
          candidate.z = target.z - dx * Math.sin(target.yaw) + dz * Math.cos(target.yaw);
          candidate.yaw = target.yaw;
          let clear = true;
          for (let j = 0; j < 8 && clear; j++) {
            if (j === i || (j % 2 === next && j > i)) continue;
            if (shoeSeparation(candidate, planted[j], separation).gap < .012) clear = false;
          }
          if (clear) { Object.assign(targets[i], candidate); found = true; break; }
        }
      }
      if (!found) throw new Error(`No compact carrier landing at ${t}, foot ${i}`);
      const to = { ...targets[i] };
      events[i].push({ start: t, end: t + duration, from: { ...planted[i] }, to });
      Object.assign(planted[i], to);
    }
    freeAt = t + duration + .015; next = 1 - next;
  }
  function foot(t, index, out = {}) {
    const list = events[index]; let lo = 0, hi = list.length;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (list[mid].start <= t) lo = mid + 1; else hi = mid; }
    const event = list[lo - 1];
    if (!event || t >= event.end) {
      const p = event?.to || initial[index];
      out.x = p.x; out.z = p.z; out.yaw = p.yaw; out.y = 0; out.contact = true;
    } else {
      const u = (t - event.start) / (event.end - event.start);
      // Lift first, move above the standing shoes, then land. Both ends have zero velocity.
      const travel = ease(Math.max(0, Math.min(1, (u - .15) / .7)));
      const lift = ease(Math.min(1, u / .15, (1 - u) / .15));
      out.x = event.from.x + (event.to.x - event.from.x) * travel;
      out.z = event.from.z + (event.to.z - event.from.z) * travel;
      out.yaw = event.from.yaw + (event.to.yaw - event.from.yaw) * travel;
      out.y = .085 * lift; out.contact = u === 0;
    }
    return out;
  }
  return { foot, events, layout: SUPPORT_LAYOUT };
}
