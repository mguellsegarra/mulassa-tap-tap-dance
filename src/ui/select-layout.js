// The selector's layout, measured after each change (never per frame): the header (towns inline or on their own row), the
// strip's rest place and peeking gap, the info column's width and floor, and her free band for the menu camera (api.band).
import { fitEntityLabel } from './figure-entities.js';
import { fitPendingTitle } from './pending-title.js';
import { peekGap, navX } from './select-strip.js';

export function createSelectLayout({ win, $, root, towns, strip, pending, bar, later, corner, facts, flip, api, view, updateArrows }) {
  let stripLimit = 0;
  const rowEdge = row => Math.max(0, ...[...row.children].map(el =>
    el.offsetLeft + el.offsetWidth + (parseFloat(win.getComputedStyle?.(el).marginRight) || 0)))
    + (parseFloat(win.getComputedStyle?.(row).paddingRight) || 0);
  const GAPS = new Map([[towns, 7], [strip, 8]]); // their CSS gaps
  function peek() { // spaces both rows so the one at the right edge is cut (all fit: as CSS has them)
    for (const [row, base] of GAPS) {
      const items = [...row.children].filter(el => el.offsetWidth && (row !== strip || !later.includes(el))), cs = win.getComputedStyle?.(row);
      const room = row.clientWidth - (parseFloat(cs?.paddingLeft) || 0);
      if (items.length && room > 0) row.style.gap = `${peekGap(items.map(el => el.offsetWidth), room, base)}px`;
    }
  }
  function measure() { flip.snap(view.shown, true); // her free band (css px): under the info block, or (info at the side) under the pills; above the strip
    const r = el => el.getBoundingClientRect(), side = win.innerWidth >= 900 || win.innerHeight <= 500;
    const z = parseFloat(win.getComputedStyle?.(root).zoom) || 1, px = v => `${v / z}px`; // big desktops zoom the layer: rects are screen px, its CSS isn't
    // header: logo left, corner buttons right; the towns fit between (asymmetric gutter: a symmetric one dropped them on an iPad) or get their own row
    const logo = [...root.querySelectorAll('.sel-logo')].map(r).filter(b => b.width > 0), right = corner.filter(el => !el.hidden).map(r).filter(b => b.width > 0);
    const oneLine = Boolean(root.querySelector('.sel-logo-line')?.getClientRects().length); // desktops: the one-line logo, the towns always on their own row below it
    const needed = bar.reduce((width, pill) => width + r(pill).width, 0) + GAPS.get(towns) * z * (bar.length - 1);
    const gutterL = Math.max(0, ...logo.map(b => b.right)) + 24, gutterR = Math.max(0, ...right.map(b => win.innerWidth - b.left)) + 24;
    const inline = Boolean(!oneLine && right.length && win.innerWidth - gutterL - gutterR >= needed);
    root.toggleAttribute('data-header-inline', inline);
    if (inline) {
      root.style.setProperty('--town-gutter-l', px(gutterL)); root.style.setProperty('--town-gutter-r', px(gutterR));
      root.style.setProperty('--town-top', px(right[0].top + (right[0].height - r(towns).height) / 2));
      root.style.setProperty('--info-top', px(Math.max(...logo.map(b => b.bottom), ...right.map(b => b.bottom)) + 16));
    } else root.style.removeProperty?.('--info-top');
    // The dock's layout box, not its rect: a pending figure drops it by a transform that may still be under way.
    const dock = $('select-bottom'), dockTop = (dock.offsetTop ?? r(dock).top / z) * z;
    // The pills' layout box, not their rect: a pending figure slides them to their new row by a transform that may still be under way.
    const townsBottom = ((towns.offsetTop ?? r(towns).top / z) + (towns.offsetHeight ?? r(towns).height / z)) * z;
    // Desktops: the first banner never starts left of the narrowest info column + 12 (the column ends at most there): 308, or
    // 410 from 1200 px (the board card keeps its %: > 400 px, select-sizes.css), 530 from 1280 (its foot keeps one line, ~492 px, ~512 with a 7-digit gap);
    // a centred strip that would (under ~1180 px) moves right instead, as far as it must. Set before peek(): its room starts there.
    const desk = win.innerWidth >= 900 && win.innerHeight >= 600, narrowest = win.innerWidth >= 1280 ? 530 : win.innerWidth >= 1200 ? 410 : 308, flag = strip.querySelector('.sel-banner');
    // Fine-pointer desktops: the strip's box starts right of the info column (below), so its cards never scroll under the column
    // and its empty part never covers the ranking's names. Laid out full width first: the column's width comes from that rest place.
    const boxed = desk && Boolean(win.matchMedia?.('(pointer: fine)').matches);
    root.style.setProperty('--strip-x', '0px'); strip.style.removeProperty?.('--strip-clip');
    const shift = desk && flag?.offsetParent ? (($('select-info').hidden ? 0 : r($('select-info')).left) - r(strip).left) / z + narrowest + 12 - (flag.offsetLeft - (parseFloat(win.getComputedStyle?.(strip).paddingLeft) || 0)) : 0;
    strip.style.setProperty('--strip-l', `${shift}px`);
    peek();
    // The live group keeps its centred origin; the pending cards follow it. Only scrollLeft moves the cards.
    const base = [...strip.children].filter(el => !later.includes(el));
    const style = win.getComputedStyle?.(strip), gap = parseFloat(style?.gap) || 8;
    const width = base.reduce((sum, el) => {
      const css = win.getComputedStyle?.(el);
      return sum + el.offsetWidth + (parseFloat(css?.marginLeft) || 0) + (parseFloat(css?.marginRight) || 0);
    }, 0) + gap * Math.max(0, base.length - 1);
    const cw = $('select-carousel').clientWidth, centred = Math.max(0, (cw - width) / 2), left = Math.max(centred, shift);
    strip.style.setProperty('--strip-inset', `${centred}px`);
    strip.style.setProperty('--strip-l', `${left}px`); strip.style.setProperty('--strip-r', `${Math.max(0, cw - width - left)}px`);
    stripLimit = Math.max(0, Math.min(rowEdge(strip), strip.scrollWidth) - strip.clientWidth);
    $('select-carousel').toggleAttribute('data-fits', stripLimit <= 1);
    updateArrows();
    // The arrow group stands above the strip while it overflows (none on touch): her band and a pending card keep clear of it.
    const nav = stripLimit > 1 ? ($('select-nav').offsetHeight || 0) * z : 0;
    // Desktops: the info column ends 12 px before the strip's first banner, at its rest place (offsetLeft: the centring,
    // not the scroll), never under a 300 px panel; long names wrap. Step 2 hides the strip: the column keeps its width.
    if (flag && desk) { if (flag.offsetParent) root.style.setProperty('--info-w', px(Math.max(narrowest * z, r(strip).left + flag.offsetLeft * z - 12 * z - r($('select-info')).left))); }
    else root.style.removeProperty?.('--info-w');
    if (desk) root.style.setProperty('--info-floor', `${narrowest}px`); else root.style.removeProperty?.('--info-floor');
    // Step 1, fine-pointer desktops: no card sits under the column (boxed, below), only the action row may. The column ends 12 px
    // before its buttons when it stays as wide as `narrowest` and the card keeps its %
    // (not narrower) and then runs down to the foot; else down to 12 px above them.
    // select-standings.js fills what this gives (step 2: levelStats()).
    if (view.step !== 'level') {
      const was = root.style.getPropertyValue?.('--info-dock') ?? '';
      if (boxed) {
        const drop = r(dock).top - dockTop, info = r($('select-info')); // drop: a pending figure's transform, the buttons at rest
        const btns = [r($('select-next'))].filter(b => b.width);
        const edge = Math.min(...btns.map(b => b.left)) - 12 * z;
        if (edge < info.right && edge - info.left >= Math.max(narrowest, 410) * z) root.style.setProperty('--info-w', px(edge - info.left));
        const under = btns.filter(b => b.left - 12 * z < r($('select-info')).right).map(b => b.top - drop);
        root.style.setProperty('--info-dock', under.length ? px(r(root).bottom - Math.min(...under) + 6 * z) : '50px');
      } else root.style.removeProperty?.('--info-dock');
      if ((root.style.getPropertyValue?.('--info-dock') ?? '') !== was) facts.fit();
    }
    if (boxed && flag?.offsetParent) { // the same rest place inside a box from the column's edge + 12: its room (peek()'s gap) and stripLimit are unchanged
      // A hidden column (pending figure) keeps its old rect for its 220 ms display fade, and the observer may skip the refit: ignore it.
      const x = $('select-info').hidden ? 12 : Math.max(0, (r($('select-info')).right - r(strip).left) / z + 12);
      const x0 = Math.min(x, 12); root.style.setProperty('--strip-x', `${x0}px`); strip.style.setProperty('--strip-clip', `${x - x0}px`); strip.style.setProperty('--strip-l', `${Math.max(0, left - x0)}px`);
    }
    root.style.setProperty('--nav-x', px(navX(win, towns, $('select-carousel'), z))); // the arrows stand at the screen's middle, whatever the info column or the dock does (clear of the pills)
    const info = r($('select-info')); // the camera's free rect (cameras.js frameMenuLens): hardTop = the pills' floor (she may rise behind the info's lower rows), a side panel takes the left
    api.band = { top: side ? townsBottom : info.bottom, bottom: dockTop - nav, hardTop: townsBottom, left: side ? info.right : 0, right: win.innerWidth };
    // Use the strip's final layout position, including its painted top gutter. CSS subtracts
    // --drop so touch reserves the lowered dock without reading its animated transform.
    const stripTop = dockTop + r(strip).top - r(dock).top;
    const pendingEnd = nav ? dockTop + r($('select-nav')).top - r(dock).top : stripTop + Math.min(...base.map(el => el.offsetTop)) * z;
    root.style.setProperty('--pending-rest-bottom', px(Math.max(0, r(root).height - pendingEnd) + 12 * z));
    if (!pending.hidden) { fitEntityLabel($('aviat-entity')); fitPendingTitle($('aviat-title'), win); }
    // Cached action bounds for diagnostic overlays; no frame-loop layout reads.
    api.fpsFooter = ['select-figures-back', 'select-next', 'select-play'].map($).filter(el => !el.hidden).map(r); flip.play();
    measured = sizes(); // what the observer would report for this layout
  }
  const sizes = () => [$('select-info'), root].map(el => `${el.offsetWidth}x${el.offsetHeight}`).join();
  let measured = '';
  return { measure, get stripLimit() { return stripLimit; }, stale: () => sizes() !== measured };
}
