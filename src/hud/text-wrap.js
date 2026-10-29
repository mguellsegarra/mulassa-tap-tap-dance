// Line breaking for canvas text. Words break at spaces; Japanese, Korean and Chinese break between characters, keeping the
// punctuation that cannot open a line (，。、！？）」 …) on the previous one and the opening ones (（「 …) with what follows.
// `measure(str)` is the canvas width of a string, so the same rules serve any font.
const NO_START = /^[，。、！？；：）」』】〉》,.!?;:)\]}»”’…・ー〜%]/;
const NO_END = /[（「『【〈《([{«“‘]$/;
const HAN = /[぀-ヿ㐀-鿿가-힯＀-￯]/; // kana, ideographs, hangul, full-width forms

function units(text) { // break units: one CJK character, or a run of other characters (a word with its punctuation)
  const out = [];
  for (const part of text.split(/(\s+)/)) {
    if (!part) continue;
    if (/^\s+$/.test(part)) { out.push(' '); continue; }
    let run = '';
    for (const ch of part) {
      if (HAN.test(ch)) { if (run) out.push(run); run = ''; out.push(ch); } else run += ch;
    }
    if (run) out.push(run);
  }
  return out;
}

export function wrapLines(text, measure, maxW, cjk = false) {
  const lines = [];
  let line = '';
  for (const u of cjk ? units(text) : text.split(/\s+/).filter(Boolean).flatMap((w, i) => (i ? [' ', w] : [w]))) {
    const next = line + u;
    if (!line || measure(next.trimEnd()) <= maxW || (cjk && NO_START.test(u))) { line = next; continue; } // hang a closing mark rather than start a line with it
    let carry = '';
    if (cjk && NO_END.test(line)) { carry = line.slice(-1); line = line.slice(0, -1); } // an opening bracket goes down with its text
    lines.push(line.trimEnd()); line = carry + (u === ' ' ? '' : u);
  }
  if (line.trim()) lines.push(line.trimEnd());
  return lines;
}
