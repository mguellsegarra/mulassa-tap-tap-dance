# The integrated fire (v=base: the game's drac-fx + drac-fire), same scene and camera. Real-time sample, then deterministic
# counters at three moments of the mock's script: everyday sparks (1.5 s), the flamarada's peak (3.15 s), the return (3.9 s).
# uv run --with playwright python bench-mock.py OUT.json
import sys, json, time
from playwright.sync_api import sync_playwright
url = 'http://localhost:5179/research/bestiari/drac/fire-lab/index.html'
SAMPLE = 10.5
CONFIGS = {
  'desktop-high': dict(viewport={'width': 1280, 'height': 800}, device_scale_factor=2, q='high', throttle=1),
  'phone-medium-cpu4': dict(viewport={'width': 393, 'height': 852}, device_scale_factor=3, is_mobile=True, has_touch=True, q='medium', throttle=4),
  'phone-low-cpu4': dict(viewport={'width': 393, 'height': 852}, device_scale_factor=3, is_mobile=True, has_touch=True, q='low', throttle=4),
  'phone-minimal-cpu6': dict(viewport={'width': 393, 'height': 852}, device_scale_factor=3, is_mobile=True, has_touch=True, q='minimal', throttle=6),
}
order = ['base', 'base']
res = {}
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'])
    for name, c0 in CONFIGS.items():
        c = dict(c0); q = c.pop('q'); thr = c.pop('throttle')
        ctx = b.new_context(**c); pg = ctx.new_page(); cdp = ctx.new_cdp_session(pg)
        for i, v in enumerate(order):
            pg.goto(f'{url}?mute&v={v}&q={q}&view=play&sync=1&label=0'); pg.wait_for_function('window.lab && window.lab.ready', timeout=60000)
            cdp.send('Emulation.setCPUThrottlingRate', {'rate': thr})
            time.sleep(2); pg.evaluate('lab.resetStats()'); time.sleep(SAMPLE)
            r = pg.evaluate('lab.report()'); pg.evaluate('lab.stop()')
            cdp.send('Emulation.setCPUThrottlingRate', {'rate': 1})
            pg.goto(f'{url}?mute&v={v}&q={q}&view=play&run=0&label=0'); pg.wait_for_function('window.lab && window.lab.ready', timeout=60000)
            cnt = {}
            done = 0
            for tag, t in ([('flamarada', 0.6), ('retorn', 1.25), ('guspires', 2.9)]): # base: its own script's CREMA peak and streak
                n = round(t * 60) - done; pg.evaluate(f'lab.step({n})'); done += n; cnt[tag] = pg.evaluate('lab.counters()')
            res.setdefault(name, {}).setdefault(v, []).append({'run': r, 'counters': cnt})
            print(name, v, 'fire', r['fireCpu'], 'render', r['render']['mean'], flush=True)
        ctx.close()
    b.close()
json.dump(res, open(sys.argv[1], 'w'), indent=1)
