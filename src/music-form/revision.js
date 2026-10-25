// A music form's revision (src/music-form/CONTRACT.md): sha-1 of its canonical JSON. Browser-safe, imports nothing.

const canonical = v => Array.isArray(v) ? `[${v.map(canonical)}]`
  : v && typeof v === 'object' ? `{${Object.keys(v).sort().map(k => `${JSON.stringify(k)}:${canonical(v[k])}`)}}`
    : JSON.stringify(v);

function sha1(text) {
  const bytes = new TextEncoder().encode(text), len = bytes.length;
  const w = new Uint32Array((((len + 8) >>> 6) + 1) * 16);
  for (let i = 0; i < len; i++) w[i >> 2] |= bytes[i] << (24 - (i & 3) * 8);
  w[len >> 2] |= 0x80 << (24 - (len & 3) * 8);
  w[w.length - 1] = len * 8;
  let [h0, h1, h2, h3, h4] = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476, 0xc3d2e1f0];
  const x = new Uint32Array(80), rol = (v, n) => (v << n) | (v >>> (32 - n));
  for (let o = 0; o < w.length; o += 16) {
    for (let i = 0; i < 16; i++) x[i] = w[o + i];
    for (let i = 16; i < 80; i++) x[i] = rol(x[i - 3] ^ x[i - 8] ^ x[i - 14] ^ x[i - 16], 1);
    let [a, b, c, d, e] = [h0, h1, h2, h3, h4];
    for (let i = 0; i < 80; i++) {
      const [f, k] = i < 20 ? [(b & c) | (~b & d), 0x5a827999] : i < 40 ? [b ^ c ^ d, 0x6ed9eba1]
        : i < 60 ? [(b & c) | (b & d) | (c & d), 0x8f1bbcdc] : [b ^ c ^ d, 0xca62c1d6];
      const t = (rol(a, 5) + f + e + k + x[i]) | 0;
      e = d; d = c; c = rol(b, 30); b = a; a = t;
    }
    h0 = (h0 + a) | 0; h1 = (h1 + b) | 0; h2 = (h2 + c) | 0; h3 = (h3 + d) | 0; h4 = (h4 + e) | 0;
  }
  return [h0, h1, h2, h3, h4].map(v => (v >>> 0).toString(16).padStart(8, '0')).join('');
}

/** The revision of a form: sha-1 of its canonical JSON (sorted keys, no whitespace). */
export const formRevision = form => sha1(canonical(form));
