// Four human carriers, two at the front and two at the rear. Distances in metres.
export const CARRIER_SCALE = { y: 2.95 / 4.03, z: 4.60 / 4.22 };
export const SUPPORT_LAYOUT = [1.15, -1.15].flatMap(z => [0.28, -0.28].flatMap(x => [0.13, -0.13].map(dx => ({ x: x + dx, z }))));

export function planSupports(poseAt, end = 166.2) {
  const pose = {}, sample = {}, initial = [], events = SUPPORT_LAYOUT.map(() => []);
  function nominal(t, index, out) {
    poseAt(t, pose);
    const point = SUPPORT_LAYOUT[index], c = Math.cos(pose.yaw), s = Math.sin(pose.yaw);
    out.x = pose.x + point.x * c + point.z * s;
    out.z = pose.z - point.x * s + point.z * c; out.yaw = pose.yaw;
    return out;
  }
  for (let i = 0; i < 8; i++) initial.push({ ...nominal(0, i, {}) });
  // Schedule at load time, not while rendering. A stationary carrier keeps their feet down.
  for (let pair = 0; pair < 4; pair++) {
    const planted = [{ ...initial[pair * 2] }, { ...initial[pair * 2 + 1] }];
    let freeAt = 0, next = 0;
    for (let frame = 1; frame / 100 < end - 0.35; frame++) {
      const t = frame / 100;
      if (t < freeAt) continue;
      let chosen = -1;
      for (const side of [next, 1 - next]) {
        nominal(t, pair * 2 + side, sample);
        if (Math.hypot(sample.x - planted[side].x, sample.z - planted[side].z) > 0.115
          || Math.abs(sample.yaw - planted[side].yaw) > 0.15) { chosen = side; break; }
      }
      if (chosen < 0) continue;
      const index = pair * 2 + chosen, from = { ...planted[chosen] };
      nominal(t + 0.1, index, sample);
      const speed = Math.abs(sample.yaw - from.yaw);
      const duration = Math.max(0.20, 0.32 - speed * 0.15);
      const to = { ...nominal(t + duration, index, {}) };
      const other = planted[1 - chosen], gap = Math.hypot(to.x - other.x, to.z - other.z);
      if (gap < 0.19) {
        const sign = chosen === 0 ? 1 : -1;
        to.x = other.x + Math.cos(to.yaw) * 0.23 * sign;
        to.z = other.z - Math.sin(to.yaw) * 0.23 * sign;
      }
      const length = Math.hypot(to.x - from.x, to.z - from.z);
      events[index].push({ start: t, end: t + duration, from, to, height: Math.min(0.085, 0.035 + length * 0.1) });
      planted[chosen] = to; freeAt = t + duration + 0.025; next = 1 - chosen;
    }
  }
  function foot(t, index, out = {}) {
    const list = events[index];
    let lo = 0, hi = list.length;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (list[mid].start <= t) lo = mid + 1; else hi = mid; }
    const event = list[lo - 1];
    if (!event || t >= event.end) {
      const p = event?.to || initial[index];
      out.x = p.x; out.z = p.z; out.yaw = p.yaw; out.y = 0; out.contact = true;
    } else {
      const u = (t - event.start) / (event.end - event.start), k = u ** 3 * (10 - 15 * u + 6 * u * u);
      out.x = event.from.x + (event.to.x - event.from.x) * k;
      out.z = event.from.z + (event.to.z - event.from.z) * k;
      out.yaw = event.from.yaw + (event.to.yaw - event.from.yaw) * k;
      out.y = Math.sin(Math.PI * u) ** 2 * event.height; out.contact = u === 0;
    }
    return out;
  }
  return { foot, events, layout: SUPPORT_LAYOUT };
}
