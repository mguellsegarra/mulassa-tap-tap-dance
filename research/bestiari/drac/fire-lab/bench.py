# Short, repeatable A/B runs of the fire lab. Per config and variant (interleaved, twice): a 2 s warm-up, then a
# real-time sample of SAMPLE s (the script loops every 7 s), then deterministic counters at the CREMA peak and the streak.
# uv run --with playwright python bench.py OUT.json [config,...]
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
out = sys.argv[1]; names = sys.argv[2].split(',') if len(sys.argv) > 2 else list(CONFIGS)
order = ['base', 'A', 'B', 'C', 'D', 'D', 'C', 'B', 'A', 'base']
res = {}
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'])
    for name in names:
        c = dict(CONFIGS[name]); q = c.pop('q'); thr = c.pop('throttle')
        ctx = b.new_context(**c); pg = ctx.new_page()
        cdp = ctx.new_cdp_session(pg)
        for i, v in enumerate(order):
            cdp.send('Emulation.setCPUThrottlingRate', {'rate': 1})
            pg.goto(f'{url}?mute&v={v}&q={q}&view=play&sync=1&label=0'); pg.wait_for_function('window.lab && window.lab.ready', timeout=60000)
            cdp.send('Emulation.setCPUThrottlingRate', {'rate': thr})
            time.sleep(2); pg.evaluate('lab.resetStats()'); time.sleep(SAMPLE)
            r = pg.evaluate('lab.report()'); pg.evaluate('lab.stop()')
            cdp.send('Emulation.setCPUThrottlingRate', {'rate': 1})
            pg.goto(f'{url}?mute&v={v}&q={q}&view=play&run=0&label=0'); pg.wait_for_function('window.lab && window.lab.ready', timeout=60000)
            pg.evaluate('lab.step(36)'); peak = pg.evaluate('lab.counters()')
            pg.evaluate('lab.step(138)'); streak = pg.evaluate('lab.counters()')
            res.setdefault(name, {}).setdefault(v, []).append({'run': r, 'crema': peak, 'streak': streak, 'gpu': pg.evaluate('lab.gpuName'), 'timer': pg.evaluate('lab.timer')})
            print(name, v, i, 'fire', r['fireCpu']['mean'] if r['fireCpu'] else None, 'render', r['render']['mean'], 'p95', r['render']['p95'], 'n', r['render']['n'], flush=True)
        ctx.close()
    b.close()
json.dump(res, open(out, 'w'), indent=1)
