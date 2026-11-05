// The cards' faces, drawn on canvases: the figure's picture with its name below.
const W = 480, H = 640, CAPTION = 110;

const canvasOf = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return [c, c.getContext('2d')]; };

export function frontCanvas({ name }, picture) {
  const [c, g] = canvasOf(), panel = H - CAPTION;
  const scale = Math.max(W / picture.width, panel / picture.height), w = picture.width * scale, h = picture.height * scale;
  g.drawImage(picture, (W - w) / 2, (panel - h) / 2, w, h);
  // the name
  g.fillStyle = '#1a110b'; g.fillRect(0, panel, W, CAPTION);
  g.fillStyle = '#f5c518'; g.fillRect(0, panel, W, 4);
  let size = 68; do { g.font = `800 ${size}px 'Baloo 2', system-ui, sans-serif`; size -= 2; } while (g.measureText(name).width > W - 36);
  g.fillStyle = '#fff3d6'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(name, W / 2, panel + CAPTION / 2 + 6);
  return c;
}

// The same back for all: its SVG plus the game's pill, in the pill's own type (Baloo 2 Extra Bold, red edge on brown).
export function backCanvas(picture) {
  const [c, g] = canvasOf(), s = W / 480;
  g.drawImage(picture, 0, 0, W, H);
  g.beginPath(); g.roundRect(70 * s, 492 * s, 340 * s, 72 * s, 36 * s);
  g.fillStyle = '#2a1a10'; g.fill();
  g.strokeStyle = '#c0283c'; g.lineWidth = 6 * s; g.stroke();
  g.fillStyle = '#fff3d6'; g.font = `800 ${50 * s}px 'Baloo 2', system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('mulassa.cat', 240 * s, 531 * s);
  return c;
}
