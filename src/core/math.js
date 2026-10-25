// Pure scalar helpers with no imports, so pure figure and dance modules can share them: angles, clamps and easing curves.
export const TAU = Math.PI * 2, DEG = Math.PI / 180;
export const clamp01 = x => Math.max(0, Math.min(1, x));
export const smooth = k => k * k * (3 - 2 * k); // smoothstep for k already in 0..1
export const smooth01 = x => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
export const quintic = q => q * q * q * (10 + q * (-15 + 6 * q)); // 0 -> 1, no speed or acceleration at either end
export const easeIn = (dt, tc) => 1 - Math.exp(-dt / tc); // a one-pole filter's step over dt, time constant tc (s)
