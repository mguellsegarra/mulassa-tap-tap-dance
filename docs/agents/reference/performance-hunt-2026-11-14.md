# A performance hunt, 2026-11-14 and 15

The full notes of a day of wrong turns on the Bou's final and the selector, and the reviews that followed. The lessons
are kept as rules in [device-profiling.md, "A performance hunt"](../device-profiling.md#a-performance-hunt); this page
keeps the cases behind them. Moved here verbatim on 2026-11-15.

- **Ask where and how it happens before measuring anything**: which screen, playing or watching, which phone, Low Power
  Mode or not. The owner's «it drops quality and the crowd leaves» was in the song, tapping its notes, in Low Power Mode:
  a rented phone (60 Hz, no Low Power Mode, no finger) could never show it, and hours went to what it could show.
- **Read the game's own verdict first.** With `?perf` every quality change is logged (`[quality] {reason, from, to, hz,
  lowPower, slowShare, capped, cpu…}`; the probe proxy keeps them): «overload at the splash, 4 s in, slowShare 0.9, cpu
  10 ms» says the monitor misread the cadence before any profile does. A crowd that thins is a quality step
  (`stepPeople`) or the song going badly (some of the ring come and go with the accuracy: `crowd-pose.js` `thr`): the
  log says which.
- **A monitor bug is reproduced in node, not on the phone.** Feed `frameMonitor` the frame intervals seen (the probe
  can post every one: `probe-proxy.mjs … rec`, an `all` array per post) and it steps or not in milliseconds of
  work; the fix then gets a test that fails without it (`tests/render/low-power.mjs`).
- **One good session proves nothing: record the owner's sessions and keep them.** A fix validated on one played song
  failed on the next. Have the owner play through the recording probe (`probe-proxy.mjs <port> <target> <label> <dir>
  rec`: every rAF interval posted, a big on-screen message while it records and when the quality steps, so they know
  when to stop), replay the intervals through
  `framePacer` and `adaptiveQuality` in node, and add each failing session to
  `tests/render/fixtures/low-power-bou.json`. Never reload or drive the tab while they play.
- **Have the work reviewed from scratch before calling a monitor rule right.** Two reviewers (2026-11-15), given the
  commits and no conclusions, each replayed a GPU-bound phone through the pacer and the rule and found it never stepped
  down again; the recorded sessions alone could not show it. A rule about «whose fault a late frame is» needs the
  opposite case as a test, not only the complaint's.
- **Known and left as they are (2026-11-15, from those reviews):** a menu that drowns at every level sets a floor no
  later menu passes for the session (`menuFloor`); at `low` the Bou's snake takes nearly all the visible ring;
  `farm-run.mjs` neither requires the owner's AWS profile nor refuses at zero trial minutes; the cover can stay 6 s on a
  phone that never draws 20 smooth frames (3 before); the fixture test feeds a fixed 9 ms of JavaScript, not the
  recorded one; the warm-up draw's own task was never timed on a phone.
- **What the rented phones played (2026-11-14): the Bou only**, with `?autoplay` at difficulty 1 (one whole song on two
  iPhones, a dozen 30 s passes) and the selector without playing. The Drac and the Mulassa were never played there, and
  neither was played in Low Power Mode on the owner's phone after the `throttled` rule: the rule is shared, the proof is not.
- **Before fixing a module, read its last commits** (`git log -5 -- <file>`): the Low Power cadence had been fixed for
  one frame pattern on 2026-11-03 and for another on 2026-11-13. A third pattern means the rule is wrong, not that one
  more case is missing; say so to the owner, who remembers the earlier fix.
- **One comparison names no owner.** Three wrong ones that day: the level buttons (the phone left its slow state at
  the first injected style, whatever it was), the Mulassa and Drac splash pair (the two profiles were seconds apart in
  Safari's warm-up; on the Mac the pair and the Bou alone cost the same), and the warm-up draw blamed for a frame that a
  quality step made. Alternate A and B, repeat across sessions, and check the second variable (time since load, order,
  the level the 3D is at) before writing a name down. A claim already told to the owner is corrected in so many words.
- **«Only the first time» is a claim to test**: start the thing three times in one session before calling a frame a
  first-use cost (the song's first frames repeat at every start; the rave's and the bombo's did not).
- **Style recalculation has no JavaScript frame**: a forced one shows under whatever read the layout (`stop` in
  `strip-scroll.js` took the blame for 21 ms of the selector hiding). Chrome's trace says how many elements each
  `UpdateLayoutTree` restyled, its invalidation tracking says which write scheduled it, and each write timed alone with
  a `getComputedStyle` after it (Mac, 4x) names the costly one in a minute.
- **JavaScript or the GPU: the Mac says which.** `Emulation.setCPUThrottlingRate` 4 with a CPU profile over the same
  song seconds: no long frame there points at a first draw or the compositor on the phone (a lead, not proof: another
  engine can have a JavaScript cost the Mac lacks).
- **Safari's first seconds are slow at any quality** (an iPhone 18 Pro in Low Power Mode: 30-70 ms of JavaScript a frame
  for 5-10 s after a load, 9 afterwards): compare profiles taken the same seconds after load, and keep the build whose
  profile you took (`--maps` needs that build's `.map` files: a rebuild changes the chunk names).
- **`ios-inspect.mjs --cached`** for a reload as a player's: with the cache disabled Safari's profiler stopped answering
  («ScriptProfiler.stopTracking timed out», no samples).
- **Never reload or drive a tab the owner is playing in.** A loop of reloads cut his song; ask, or use another tab.
- **The plugged-in iPhone, driven without the owner** (Device Hub and Cua on the Mac it is plugged into, from a
  delegated agent there): a click reaches the phone only with the mirror fitted («Zoom to Fit»; zoomed, with its «Zoom
  Controls» banner, every click was swallowed); the drag for Control Center and the Home button did nothing that day, so
  Low Power Mode is the owner's to switch (iOS drops it at 80% of charge: check `lowPower` in `?perf` before every run);
  a tap at the splash's centre can land on the language prompt or leave Safari, so look before and after each one.
  Through the probe's `__cmd` a synthetic `pointerdown`/`pointerup`/`click` on the element at the centre passes the
  splash (no audio), `.sel-card[data-id="…"]` picks a figure and `__dbg.choose(level)` starts its song.
- **The bridge dies with the cable**: after the phone is unplugged or locked for a while `:9221/json` lists nothing and
  `:9222` refuses; restart `ios_webkit_debug_proxy` on that Mac. Tabs show only with Safari in front and unlocked.
- **A tunnel to `vite preview` answers 403** («host is not allowed»): put the probe proxy in front (it is what the
  tunnel points at). A new quick tunnel may not resolve on this Mac for minutes (a cached miss): check it through a
  public resolver (`dig @1.1.1.1`, `curl --resolve`) before calling it down.
- **A rule that reads «never do X in the menus» can be right for one phone and wrong for the rest**: «no quality step
  out of a song» fixed the iPhone 8's slow selector and was undone the same hour, because weak phones find their level in
  the menu and would otherwise step down mid-song. Six existing tests said so: read what the failing tests protect
  before rewriting them.
- Close what the hunt opened (tunnels, previews, proxies, the bridge on the other Mac) and say what stays (the Device
  Farm project, free).
