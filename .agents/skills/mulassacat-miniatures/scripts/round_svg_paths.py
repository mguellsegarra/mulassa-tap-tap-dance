#!/usr/bin/env python3
"""Round the coordinates of every <path d="..."> in an SVG without drift.

Relative commands are rounded against the already-rounded current point, so the error never accumulates along a path:
every point lands within half a unit (at --decimals 0) of where it was. Command letters are kept (relative stays
relative). Use it on traced portraits whose path units are much smaller than a screen pixel (the Drac's are scaled
by ~0.108 into a 160-wide viewBox, so one path unit is about 0.13 px on a card).

  python3 round_svg_paths.py in.svg out.svg [--decimals 0]
"""
import re
import sys

ARGS = {'M': 2, 'L': 2, 'T': 2, 'H': 1, 'V': 1, 'C': 6, 'S': 4, 'Q': 4, 'A': 7, 'Z': 0}
TOKEN = re.compile(r'[MmLlHhVvCcSsQqTtAaZz]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?')


def fmt(v, dec):
    s = f'{round(v, dec):.{dec}f}' if dec else str(int(round(v)))
    if '.' in s:
        s = s.rstrip('0').rstrip('.')
    if s in ('-0', ''):
        s = '0'
    return s[1:] if s.startswith('0.') else ('-' + s[2:] if s.startswith('-0.') else s)


def round_path(d, dec=0):
    toks = TOKEN.findall(d)
    out, i, cmd = [], 0, None
    cx = cy = sx = sy = 0.0      # true current point / subpath start
    rx_ = ry_ = rsx = rsy = 0.0  # rounded current point / subpath start
    q = lambda v: round(v, dec)
    while i < len(toks):
        if toks[i].isalpha():
            cmd = toks[i]; i += 1; out.append(cmd)
            if cmd in 'Zz':
                cx, cy, rx_, ry_ = sx, sy, rsx, rsy
                continue
        elif cmd is None:
            raise ValueError('path starts with a number')
        n = ARGS[cmd.upper()]
        vals = [float(t) for t in toks[i:i + n]]; i += n
        rel = cmd.islower()
        ox, oy = (cx, cy) if rel else (0.0, 0.0)
        U = cmd.upper()
        if U == 'H':
            ax = ox + vals[0]; rax = q(ax)
            out.append(fmt(rax - rx_ if rel else rax, dec)); cx, rx_ = ax, rax
        elif U == 'V':
            ay = (cy if rel else 0) + vals[0]; ray = q(ay)
            out.append(fmt(ray - ry_ if rel else ray, dec)); cy, ry_ = ay, ray
        elif U == 'A':
            rxa, rya, rot, large, sweep, x, y = vals
            ax, ay = ox + x, oy + y; rax, ray = q(ax), q(ay)
            ex, ey = (rax - rx_, ray - ry_) if rel else (rax, ray)
            out += [fmt(rxa, dec), fmt(rya, dec), fmt(rot, dec), str(int(large)), str(int(sweep)), fmt(ex, dec), fmt(ey, dec)]
            cx, cy, rx_, ry_ = ax, ay, rax, ray
        else:
            pts = [(ox + vals[k], oy + vals[k + 1]) for k in range(0, n, 2)]
            for ax, ay in pts:
                rax, ray = q(ax), q(ay)
                out += [fmt(rax - rx_ if rel else rax, dec), fmt(ray - ry_ if rel else ray, dec)]
            cx, cy = pts[-1]; rx_, ry_ = q(cx), q(cy)
            if U == 'M':
                sx, sy, rsx, rsy = cx, cy, rx_, ry_
                cmd = 'l' if rel else 'L'  # implicit repeats after a moveto are linetos
    s = ' '.join(out)
    s = re.sub(r' ?([A-Za-z]) ?', r'\1', s)
    return re.sub(r' (-)', r'\1', s)


def endpoints(d):
    """Absolute end point of every segment (for the drift check)."""
    toks, i, cmd, pts = TOKEN.findall(d), 0, None, []
    cx = cy = sx = sy = 0.0
    while i < len(toks):
        if toks[i].isalpha():
            cmd = toks[i]; i += 1
            if cmd in 'Zz':
                cx, cy = sx, sy; pts.append((cx, cy)); continue
        n = ARGS[cmd.upper()]; v = [float(t) for t in toks[i:i + n]]; i += n
        rel, U = cmd.islower(), cmd.upper()
        if U == 'H': cx = (cx if rel else 0) + v[0]
        elif U == 'V': cy = (cy if rel else 0) + v[0]
        else:
            x, y = v[-2], v[-1]
            cx, cy = (cx + x, cy + y) if rel else (x, y)
            if U == 'M': sx, sy = cx, cy; cmd = 'l' if rel else 'L'
        pts.append((cx, cy))
    return pts


def check(svg_a, svg_b, dec=0):
    """Largest distance any end point moved; raises if it exceeds half a unit at that precision."""
    da = re.findall(r'\sd=(["\'])(.*?)\1', svg_a, re.S); db = re.findall(r'\sd=(["\'])(.*?)\1', svg_b, re.S)
    assert len(da) == len(db), 'path count changed'
    worst = 0.0
    for (_, a), (_, b) in zip(da, db):
        pa, pb = endpoints(a), endpoints(b)
        assert len(pa) == len(pb), 'segment count changed'
        worst = max([worst] + [max(abs(x - u), abs(y - w)) for (x, y), (u, w) in zip(pa, pb)])
    assert worst <= 0.5 * 10 ** -dec + 1e-6, f'drift {worst}'
    return worst


def round_svg(svg, dec=0):
    return re.sub(r'(\sd=)(["\'])(.*?)\2', lambda m: m.group(1) + m.group(2) + round_path(m.group(3), dec) + m.group(2), svg, flags=re.S)


if __name__ == '__main__':
    src, dst = sys.argv[1], sys.argv[2]
    dec = int(sys.argv[sys.argv.index('--decimals') + 1]) if '--decimals' in sys.argv else 0
    before = open(src).read(); after = round_svg(before, dec)
    print(f'{len(before)} -> {len(after)} bytes, worst end-point shift {check(before, after, dec):.3f} path units')
    open(dst, 'w').write(after)
